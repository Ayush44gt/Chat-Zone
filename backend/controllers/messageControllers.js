const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const { emitToUsers } = require("../socket");

const DEFAULT_PAGE = 40;
const MAX_PAGE = 100;

// Loads the chat only if the requester is one of its members
const findChatForMember = async (chatId, req, res) => {
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    res.status(400);
    throw new Error("Invalid chat id");
  }

  const chat = await Chat.findOne({ _id: chatId, users: req.user._id });
  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }
  return chat;
};

//@description     Get a page of messages, newest page first
//@route           GET /api/message/:chatId?before=<ISO date>&limit=
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  const chat = await findChatForMember(req.params.chatId, req, res);

  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || DEFAULT_PAGE, 1),
    MAX_PAGE
  );
  const filter = { chat: chat._id };

  if (req.query.before) {
    const before = new Date(req.query.before);
    if (isNaN(before)) {
      res.status(400);
      throw new Error("Invalid before date");
    }
    filter.createdAt = { $lt: before };
  }

  const page = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("sender", "name pic email");

  const hasMore = page.length > limit;
  res.json({ messages: page.slice(0, limit).reverse(), hasMore });
});

//@description     Create New Message
//@route           POST /api/message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const content = String(req.body.content || "").trim();
  // Older clients sent the whole chat object as chatId
  const chatId =
    req.body.chatId && req.body.chatId._id ? req.body.chatId._id : req.body.chatId;

  if (!content || !chatId) {
    res.status(400);
    throw new Error("content and chatId are required");
  }
  if (content.length > 4000) {
    res.status(400);
    throw new Error("Message is too long (max 4000 characters)");
  }

  const chat = await findChatForMember(chatId, req, res);

  let message = await Message.create({
    sender: req.user._id,
    content,
    chat: chat._id,
  });
  message = await message.populate("sender", "name pic email").execPopulate();

  chat.latestMessage = message._id;
  await chat.save();

  emitToUsers(chat.users, "message:new", message);
  res.status(201).json(message);
});

//@description     Mark every message in a chat as read by the requester
//@route           PUT /api/message/read/:chatId
//@access          Protected
const markChatRead = asyncHandler(async (req, res) => {
  const chat = await findChatForMember(req.params.chatId, req, res);

  const result = await Message.updateMany(
    {
      chat: chat._id,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    },
    { $addToSet: { readBy: req.user._id } }
  );

  if (result.nModified > 0) {
    emitToUsers(chat.users, "messages:read", {
      chatId: String(chat._id),
      userId: String(req.user._id),
    });
  }
  res.json({ updated: result.nModified });
});

//@description     Delete one of your own messages
//@route           DELETE /api/message/:messageId
//@access          Protected
const deleteMessage = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.messageId)) {
    res.status(400);
    throw new Error("Invalid message id");
  }

  const message = await Message.findById(req.params.messageId);
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }
  if (String(message.sender) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You can only delete your own messages");
  }

  const chat = await findChatForMember(message.chat, req, res);

  message.deleted = true;
  message.content = "";
  await message.save();

  emitToUsers(chat.users, "message:deleted", {
    chatId: String(chat._id),
    messageId: String(message._id),
  });
  res.json({ _id: message._id, deleted: true });
});

module.exports = { allMessages, sendMessage, markChatRead, deleteMessage };

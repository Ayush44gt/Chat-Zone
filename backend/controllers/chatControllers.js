const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { emitToUsers } = require("../socket");

const populateChat = (query) =>
  query
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate({
      path: "latestMessage",
      populate: { path: "sender", select: "name pic email" },
    });

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const sameId = (a, b) => String(a && a._id ? a._id : a) === String(b && b._id ? b._id : b);
const memberIds = (chat) => chat.users.map((u) => String(u._id || u));

// Loads a group the requester belongs to, or responds with the right error
const findGroupForMember = async (req, res) => {
  const { chatId } = req.body;
  if (!isValidId(chatId)) {
    res.status(400);
    throw new Error("Invalid chat id");
  }

  const chat = await Chat.findOne({ _id: chatId, isGroupChat: true });
  if (!chat) {
    res.status(404);
    throw new Error("Group not found");
  }
  if (!chat.users.some((id) => sameId(id, req.user._id))) {
    res.status(403);
    throw new Error("You are not a member of this group");
  }
  return chat;
};

const requireAdmin = (chat, req, res) => {
  if (!sameId(chat.groupAdmin, req.user._id)) {
    res.status(403);
    throw new Error("Only the group admin can do this");
  }
};

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId || !isValidId(userId)) {
    res.status(400);
    throw new Error("A valid userId is required");
  }
  if (sameId(userId, req.user._id)) {
    res.status(400);
    throw new Error("You cannot start a chat with yourself");
  }
  if (!(await User.exists({ _id: userId }))) {
    res.status(404);
    throw new Error("User not found");
  }

  const existing = await populateChat(
    Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user._id, userId], $size: 2 },
    })
  );
  if (existing) return res.json(existing);

  const created = await Chat.create({
    chatName: "sender",
    isGroupChat: false,
    users: [req.user._id, userId],
  });
  const fullChat = await populateChat(Chat.findById(created._id));

  emitToUsers([userId], "chat:updated", fullChat);
  res.status(201).json(fullChat);
});

//@description     Fetch all chats for a user, with unread counts
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  const chats = await populateChat(
    Chat.find({ users: req.user._id }).sort({ updatedAt: -1 })
  ).lean();

  const unread = await Message.aggregate([
    {
      $match: {
        chat: { $in: chats.map((c) => c._id) },
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
        deleted: { $ne: true },
      },
    },
    { $group: { _id: "$chat", count: { $sum: 1 } } },
  ]);
  const unreadByChat = new Map(unread.map((u) => [String(u._id), u.count]));

  res.json(
    chats.map((chat) => ({
      ...chat,
      unreadCount: unreadByChat.get(String(chat._id)) || 0,
    }))
  );
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  let users = req.body.users;

  if (!users || !name) {
    res.status(400);
    throw new Error("Please fill all the fields");
  }

  // Older clients send the member list as a JSON string
  if (typeof users === "string") {
    try {
      users = JSON.parse(users);
    } catch (error) {
      users = null;
    }
  }
  if (!Array.isArray(users)) {
    res.status(400);
    throw new Error("users must be a list of user ids");
  }

  const ids = [
    ...new Set(users.map((u) => String(u && u._id ? u._id : u))),
  ].filter((id) => !sameId(id, req.user._id));

  if (ids.length < 2) {
    res.status(400);
    throw new Error("At least 2 other members are required to form a group");
  }
  if (!ids.every(isValidId) || (await User.countDocuments({ _id: { $in: ids } })) !== ids.length) {
    res.status(400);
    throw new Error("One or more selected users do not exist");
  }

  const groupChat = await Chat.create({
    chatName: name,
    users: [...ids, req.user._id],
    isGroupChat: true,
    groupAdmin: req.user._id,
  });

  const fullGroupChat = await populateChat(Chat.findById(groupChat._id));

  emitToUsers(ids, "chat:updated", fullGroupChat);
  res.status(201).json(fullGroupChat);
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected (any member)
const renameGroup = asyncHandler(async (req, res) => {
  const chatName = String(req.body.chatName || "").trim();
  if (!chatName) {
    res.status(400);
    throw new Error("Group name cannot be empty");
  }

  const chat = await findGroupForMember(req, res);
  chat.chatName = chatName;
  await chat.save();

  const updated = await populateChat(Chat.findById(chat._id));
  emitToUsers(memberIds(updated), "chat:updated", updated);
  res.json(updated);
});

// @desc    Add user to Group
// @route   PUT /api/chat/groupadd
// @access  Protected (admin only)
const addToGroup = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await findGroupForMember(req, res);
  requireAdmin(chat, req, res);

  if (!isValidId(userId) || !(await User.exists({ _id: userId }))) {
    res.status(404);
    throw new Error("User not found");
  }
  if (chat.users.some((id) => sameId(id, userId))) {
    res.status(400);
    throw new Error("User is already in the group");
  }

  chat.users.push(userId);
  await chat.save();

  const updated = await populateChat(Chat.findById(chat._id));
  emitToUsers(memberIds(updated), "chat:updated", updated);
  res.json(updated);
});

// @desc    Remove user from Group / Leave
// @route   PUT /api/chat/groupremove
// @access  Protected (admin, or a member removing themselves)
const removeFromGroup = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await findGroupForMember(req, res);
  const leaving = sameId(userId, req.user._id);

  if (!leaving) requireAdmin(chat, req, res);

  if (!chat.users.some((id) => sameId(id, userId))) {
    res.status(400);
    throw new Error("User is not in the group");
  }

  chat.users = chat.users.filter((id) => !sameId(id, userId));

  // A group nobody is left in has no reason to exist
  if (chat.users.length === 0) {
    await Message.deleteMany({ chat: chat._id });
    await chat.deleteOne();
    emitToUsers([userId], "chat:removed", { chatId: String(chat._id) });
    return res.json({ _id: chat._id, removed: true });
  }

  // Hand the group over when the admin leaves
  if (sameId(chat.groupAdmin, userId)) chat.groupAdmin = chat.users[0];
  await chat.save();

  const updated = await populateChat(Chat.findById(chat._id));
  emitToUsers(memberIds(updated), "chat:updated", updated);
  emitToUsers([userId], "chat:removed", { chatId: String(chat._id) });
  res.json(updated);
});

// @desc    Delete a group and its messages
// @route   DELETE /api/chat/group/:chatId
// @access  Protected (admin only)
const deleteGroup = asyncHandler(async (req, res) => {
  req.body = { chatId: req.params.chatId };
  const chat = await findGroupForMember(req, res);
  requireAdmin(chat, req, res);

  const members = memberIds(chat);
  await Message.deleteMany({ chat: chat._id });
  await chat.deleteOne();

  emitToUsers(members, "chat:removed", { chatId: String(chat._id) });
  res.json({ _id: chat._id, removed: true });
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  deleteGroup,
};

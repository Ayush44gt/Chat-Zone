const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/userModel");
const Chat = require("./models/chatModel");

let io;
// userId -> number of open sockets (a user can have several tabs/devices)
const online = new Map();

const isLocalOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

const allowOrigin = (origin, callback) => {
  const allowed = (process.env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (!origin || isLocalOrigin(origin) || allowed.includes(origin)) {
    return callback(null, true);
  }
  callback(new Error("Origin not allowed"));
};

// Emit an event into the personal room of each given user
const emitToUsers = (userIds, event, payload) => {
  if (!io) return;
  userIds.forEach((id) => io.to(String(id)).emit(event, payload));
};

const relayTyping = (socket, event) => async (payload) => {
  const chatId = payload && payload.chatId;
  if (!chatId) return;

  try {
    const chat = await Chat.findOne({ _id: chatId, users: socket.userId })
      .select("users")
      .lean();
    if (!chat) return;

    const others = chat.users.filter((id) => String(id) !== socket.userId);
    emitToUsers(others, event, {
      chatId: String(chatId),
      userId: socket.userId,
      name: socket.userName,
    });
  } catch (error) {
    // an invalid chat id from a client is not worth crashing over
  }
};

const initSocket = (server) => {
  io = new Server(server, {
    pingTimeout: 60000,
    cors: { origin: allowOrigin },
  });

  // Every socket must present the same JWT the REST API uses
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error("Not authorized, no token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name");
      if (!user) return next(new Error("Not authorized, user not found"));

      socket.userId = String(user._id);
      socket.userName = user.name;
      next();
    } catch (error) {
      next(new Error("Not authorized, token failed"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket;
    socket.join(userId);

    const count = (online.get(userId) || 0) + 1;
    online.set(userId, count);
    if (count === 1) io.emit("presence", { userId, online: true });

    socket.emit("presence:list", Array.from(online.keys()));

    socket.on("typing", relayTyping(socket, "typing"));
    socket.on("stop typing", relayTyping(socket, "stop typing"));

    socket.on("disconnect", async () => {
      const remaining = (online.get(userId) || 1) - 1;
      if (remaining > 0) return online.set(userId, remaining);

      online.delete(userId);
      const lastSeen = new Date();
      io.emit("presence", { userId, online: false, lastSeen });
      try {
        await User.updateOne({ _id: userId }, { lastSeen });
      } catch (error) {
        console.error(`Failed to store lastSeen: ${error.message}`);
      }
    });
  });

  return io;
};

module.exports = { initSocket, emitToUsers };

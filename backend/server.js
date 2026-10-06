const path = require("path");
const http = require("http");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") }); // load env first
const express = require("express");
require("colors");
const connectDB = require("./config/db");
const { initSocket } = require("./socket");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

if (!process.env.JWT_SECRET) {
  console.error("Error: JWT_SECRET not defined".red.bold);
  process.exit(1);
}

connectDB();

const app = express();
// Profile pictures arrive as base64 data URLs
app.use(express.json({ limit: "2mb" }));

// Routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api", notFound);

// Locally stored profile pictures
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), { fallthrough: false })
);

// Deployment
const buildDir = path.resolve(__dirname, "../frontend/build");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(buildDir));
  app.get("*", (req, res) => res.sendFile(path.join(buildDir, "index.html")));
} else {
  app.get("/", (req, res) => res.send("API is running.."));
}

// Error middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5006;
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () =>
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

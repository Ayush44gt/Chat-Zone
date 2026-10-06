const express = require("express");
const {
  allMessages,
  sendMessage,
  markChatRead,
  deleteMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/read/:chatId").put(protect, markChatRead);
router.route("/:chatId").get(protect, allMessages);
router.route("/:messageId").delete(protect, deleteMessage);
router.route("/").post(protect, sendMessage);

module.exports = router;

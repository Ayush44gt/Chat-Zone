const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  getMe,
  updateProfile,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/").post(registerUser);
router.post("/login", authUser);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

module.exports = router;

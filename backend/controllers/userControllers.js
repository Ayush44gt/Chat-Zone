const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const generateToken = require("../config/generateToken");
const { saveAvatar, removeAvatar } = require("../utils/saveAvatar");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const authResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
  pic: user.pic,
  about: user.about,
  token: generateToken(user._id),
});

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Protected
const allUsers = asyncHandler(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const filter = { _id: { $ne: req.user._id } };

  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const users = await User.find(filter)
    .select("-password")
    .sort({ name: 1 })
    .limit(50);
  res.send(users);
});

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all the fields");
  }
  if (!EMAIL_REGEX.test(email)) {
    res.status(400);
    throw new Error("Please enter a valid email address");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400);
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  let pic = "";
  try {
    pic = saveAvatar(req.body.pic);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const user = await User.create({ name, email, password, pic });
  res.status(201).json(authResponse(user));
});

//@description     Auth the user
//@route           POST /api/user/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json(authResponse(user));
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

//@description     Get the logged in user
//@route           GET /api/user/me
//@access          Protected
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

//@description     Update name, about, picture or password
//@route           PUT /api/user/profile
//@access          Protected
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, about, pic, currentPassword, newPassword } = req.body;

  if (name !== undefined) {
    if (!String(name).trim()) {
      res.status(400);
      throw new Error("Name cannot be empty");
    }
    user.name = name;
  }

  if (about !== undefined) user.about = about;

  if (pic !== undefined) {
    const previous = user.pic;
    try {
      user.pic = saveAvatar(pic);
    } catch (error) {
      res.status(400);
      throw error;
    }
    if (previous !== user.pic) removeAvatar(previous);
  }

  if (newPassword) {
    if (!(await user.matchPassword(String(currentPassword || "")))) {
      res.status(400);
      throw new Error("Current password is incorrect");
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      res.status(400);
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    user.password = String(newPassword);
  }

  await user.save();
  res.json(authResponse(user));
});

module.exports = { allUsers, registerUser, authUser, getMe, updateProfile };

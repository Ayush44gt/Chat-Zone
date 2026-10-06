const jwt = require("jsonwebtoken");
const User = require("../models/userModel.js");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, token failed");
  }

  req.user = await User.findById(decoded.id).select("-password");

  // The token is valid but the account no longer exists
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }

  next();
});

module.exports = { protect };

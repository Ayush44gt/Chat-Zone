const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.resolve(__dirname, "../uploads/avatars");
const MAX_BYTES = 1024 * 1024; // 1 MB after the client-side resize
const EXTENSIONS = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp" };

// Stores a base64 data URL on disk and returns the public path to it.
// Returns the value untouched when it is already a stored path, and ""
// when the picture is being cleared.
const saveAvatar = (pic) => {
  if (!pic) return "";
  if (typeof pic !== "string") throw new Error("Invalid picture");
  if (pic.startsWith("/uploads/avatars/")) return pic;

  const match = pic.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Picture must be a PNG, JPEG or WebP image");

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_BYTES) throw new Error("Picture is too large (max 1 MB)");

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const fileName = `${crypto.randomBytes(12).toString("hex")}.${EXTENSIONS[match[1]]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);

  return `/uploads/avatars/${fileName}`;
};

const removeAvatar = (pic) => {
  if (!pic || !pic.startsWith("/uploads/avatars/")) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(pic)), () => {});
};

module.exports = { saveAvatar, removeAvatar };

// middleware/multer.js
const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".txt", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, TXT, DOCX, PNG, JPG, JPEG, WEBP, GIF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter,
});

module.exports = upload;
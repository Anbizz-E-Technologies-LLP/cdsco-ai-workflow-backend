const path = require("path");

const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".txt") return "txt";
  if (ext === ".docx") return "docx";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
  return "other";
};

const getImageMediaType = (filename) => {
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[path.extname(filename).toLowerCase()] || "image/jpeg";
};

module.exports = { getFileType, getImageMediaType };
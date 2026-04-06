const multer = require('multer');
const path = require('path');

// store in memory (required for pdf-parse)
const storage = multer.memoryStorage();

// file filter
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.txt', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, TXT, and DOCX files are allowed'), false);
  }
};

// multer config
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter,
});

module.exports = upload;
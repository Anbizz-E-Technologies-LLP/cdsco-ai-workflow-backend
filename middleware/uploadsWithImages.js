const path = require('path');
const multer = require('multer');


const storage = multer.memoryStorage();

const uploadsWithImages = multer({
  storage: storage,
  fileFilter: function(req, file, callback) {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(fileExtension);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

    if (isValidExtension && isValidMimeType) {
      callback(null, true);
    } else {
      callback(new Error('Only PDF and image files are supported!'));
    }
  },
  limits: {
  fileSize: 1024 * 1024 * 1024 * 2 
  }
});

module.exports = uploadsWithImages;

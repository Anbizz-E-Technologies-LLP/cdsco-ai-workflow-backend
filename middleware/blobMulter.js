const multer = require("multer");

const storage = multer.memoryStorage();
const azureUpload = multer({ storage });

module.exports={azureUpload}

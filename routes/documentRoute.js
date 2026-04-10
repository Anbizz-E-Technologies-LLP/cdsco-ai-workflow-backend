const express = require('express')
const router = express.Router()
const upload = require('../middleware/upload')  // ✅ Your multer
const documentController = require('../controller/documentController')

// ✅ These routes
router.post('/', upload.single('file'), documentController.uploadDocument)
router.get('/', documentController.getDocuments)
router.get('/:id', documentController.getDocumentById)
router.delete('/:id', documentController.deleteDocument)
router.patch("/:id/submit", documentController.submitForApproval);
router.patch("/:id/review", documentController.reviewDocument);
module.exports = router
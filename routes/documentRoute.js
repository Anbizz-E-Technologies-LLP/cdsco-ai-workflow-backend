const express = require('express')
const router = express.Router()
const upload = require('../middleware/upload')  
const documentController = require('../controller/documentController')
const { protect } = require('../middleware/authMiddleware')  

router.post('/', upload.single('file'),  protect,documentController.uploadDocument)
router.get('/',  protect, documentController.getDocuments)
router.get('/:id', documentController.getDocumentById)
router.delete('/:id',  protect, documentController.deleteDocument)
router.patch("/:id/submit",  protect,documentController.submitForApproval);
router.patch("/:id/review",  protect, documentController.reviewDocument);
module.exports = router
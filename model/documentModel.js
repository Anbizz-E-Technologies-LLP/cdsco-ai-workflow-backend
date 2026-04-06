// const mongoose = require("mongoose");

// const documentSchema = new mongoose.Schema(
//   {
//     originalName: String,
//     fileType: String,
//     fileSize: Number,
//     extractedText: String,
//     wordCount: Number,
//     pageCount: Number,
//     status: {
//       type: String,
//       default: "pending",
//     },
//     analysisResult: Object,
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Document", documentSchema);

const mongoose = require('mongoose')

const DocumentSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['pdf', 'txt', 'docx', 'other'],
    default: 'other',
  },
  fileSize: {
    type: Number,
  },
  extractedText: {
    type: String,
    default: '',
  },
  wordCount: {
    type: Number,
    default: 0,
  },
  pageCount: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'failed'],
    default: 'uploaded',
  },
  analysisResult: {
    completenessScore: { type: Number, default: null },
    severityClass: { type: String, default: null },
    entityCount: { type: Number, default: 0 },
    missingFields: [{ type: String }],
    duplicateRisk: { type: Boolean, default: false }, 
    summaryText: { type: String, default: '' },
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Document', DocumentSchema)

// const mongoose = require("mongoose");

// const DocumentSchema = new mongoose.Schema(
//   {
//     originalName: { type: String, required: true },
//     fileType: {
//       type: String,
//       enum: ["pdf", "txt", "docx", "other"],
//       default: "other",
//     },
//     fileSize: { type: Number },
//     extractedText: { type: String, default: "" },
//     wordCount: { type: Number, default: 0 },
//     pageCount: { type: Number, default: 1 },
//     status: {
//       type: String,
//       enum: ["uploaded", "processing", "processed", "failed"],
//       default: "uploaded",
//     },

//     // ── Flattened analysis fields (for easy querying/listing) ──────────────
//     analysisResult: {
//       completenessScore: { type: Number, default: 0 },
//       severityClass: { type: String, default: "other" },
//       duplicateRisk: { type: Boolean, default: false },
//       entityCount: { type: Number, default: 0 },
//       piiEntities: [String],
//       missingFields: [String],
//       keyFindings: [String],
//       recommendations: [String],
//     },

//     // ── Full GPT-4o response ───────────────────────────────────────────────
//     gptResponse: {
//       rawMessage: String,
//       structured: mongoose.Schema.Types.Mixed,  // full JSON from GPT
//       model: String,
//       tokens: {
//         prompt: Number,
//         completion: Number,
//         total: Number,
//       },
//       finishReason: String,
//     },

//     customPrompt: String,
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Document", DocumentSchema);

const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["pdf", "txt", "docx", "other"],
      default: "other",
    },
    fileSize: { type: Number },
    extractedText: { type: String, default: "" },
    wordCount: { type: Number, default: 0 },
    pageCount: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed"],
      default: "uploaded",
    },

    customPrompt: String,

    // Full structured analysis from GPT
    analysisResult: {
      documentType:      { type: String, default: "Unknown" },
      completenessScore: { type: Number, default: 0 },
      plainEnglishSummary: { type: String, default: "" },

      documentOverview: {
        documentType: String,
        madeBy:       String,
        madeFor:      String,
        purpose:      String,
      },

      fieldByFieldExplanation: [
        {
          fieldName:           String,
          value:               String,
          plainEnglishMeaning: String,
          plainEnglishValue:   String,
        },
      ],

      technicalTermsExplained: [
        {
          term:              String,
          simpleExplanation: String,
        },
      ],

      unusualObservations: {
        hasUnusualValues: { type: Boolean, default: false },
        observations:     [String],
        missingFields:    [String],
      },
    },

    // Raw GPT metadata
    gptResponse: {
      rawMessage:  String,
      structured:  mongoose.Schema.Types.Mixed,
      model:       String,
      tokens: {
        prompt:     Number,
        completion: Number,
        total:      Number,
      },
      finishReason: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
  

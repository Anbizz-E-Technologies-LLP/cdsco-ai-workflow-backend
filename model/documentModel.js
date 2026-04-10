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

//     customPrompt: String,

//     // Full structured analysis from GPT
//     analysisResult: {
//       documentType:      { type: String, default: "Unknown" },
//       completenessScore: { type: Number, default: 0 },
//       plainEnglishSummary: { type: String, default: "" },

//       documentOverview: {
//         documentType: String,
//         madeBy:       String,
//         madeFor:      String,
//         purpose:      String,
//       },

//       fieldByFieldExplanation: [
//         {
//           fieldName:           String,
//           value:               String,
//           plainEnglishMeaning: String,
//           plainEnglishValue:   String,
//         },
//       ],

//       technicalTermsExplained: [
//         {
//           term:              String,
//           simpleExplanation: String,
//         },
//       ],

//       unusualObservations: {
//         hasUnusualValues: { type: Boolean, default: false },
//         observations:     [String],
//         missingFields:    [String],
//       },
//     },

//     // Raw GPT metadata
//     gptResponse: {
//       rawMessage:  String,
//       structured:  mongoose.Schema.Types.Mixed,
//       model:       String,
//       tokens: {
//         prompt:     Number,
//         completion: Number,
//         total:      Number,
//       },
//       finishReason: String,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Document", DocumentSchema);

const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
     userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

     originalName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["pdf", "txt", "docx", "other"],
      default: "other",
    },
    fileSize:      { type: Number },
    extractedText: { type: String, default: "" },
    wordCount:     { type: Number, default: 0 },
    pageCount:     { type: Number, default: 1 },

    status: {
      type: String,
      enum: [
        "uploaded",
        "processing",
        "analyzed",
        "failed",
        "deleted",  
        "pending_review",
        "changes_requested",
        "approved",
        "rejected",
      ],
      default: "uploaded",
      index: true,
    },

    customPrompt: { type: String, default: null },
    deletedAt: { type: Date, default: null },
     submittedAt: { type: Date, default: null },

     reviewedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewNote: { type: String, default: null },

     analysisResult: {
      documentType:        { type: String, default: "Unknown" },
      completenessScore:   { type: Number, default: 0 },
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

     gptResponse: {
      rawMessage:   String,
      structured:   mongoose.Schema.Types.Mixed,
      model:        String,
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
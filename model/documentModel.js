// const mongoose = require("mongoose");

// const DocumentSchema = new mongoose.Schema(
//   {
//      userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },

//      originalName: { type: String, required: true },
//     fileType: {
//       type: String,
//       enum: ["pdf", "txt", "docx", "other"],
//       default: "other",
//     },
//     fileSize:      { type: Number },
//     extractedText: { type: String, default: "" },
//     wordCount:     { type: Number, default: 0 },
//     pageCount:     { type: Number, default: 1 },

//     status: {
//       type: String,
//       enum: [
//         "uploaded",
//         "processing",
//         "analyzed",
//         "failed",
//         "deleted",  
//         "pending_review",
//         "changes_requested",
//         "approved",
//         "rejected",
//       ],
//       default: "uploaded",
//       index: true,
//     },

//     customPrompt: { type: String, default: null },
//     deletedAt: { type: Date, default: null },
//      submittedAt: { type: Date, default: null },

//      reviewedAt: { type: Date, default: null },
//     reviewedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     reviewNote: { type: String, default: null },
//      analysisResult: {
//       documentType:        { type: String, default: "Unknown" },
//       completenessScore:   { type: Number, default: 0 },
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

//      gptResponse: {
//       rawMessage:   String,
//       structured:   mongoose.Schema.Types.Mixed,
//       model:        String,
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

// const mongoose = require("mongoose");

// const DocumentSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },

//     originalName: { type: String, required: true },
//     fileType: {
//       type: String,
//       enum: ["pdf", "txt", "docx", "other"],
//       default: "other",
//     },
//     fileSize:      { type: Number },
//     extractedText: { type: String, default: "" },
//     wordCount:     { type: Number, default: 0 },
//     pageCount:     { type: Number, default: 1 },

//     status: {
//       type: String,
//       enum: [
//         "uploaded",
//         "processing",
//         "analyzed",
//         "failed",
//         "deleted",
//         "pending_review",
//         "changes_requested",
//         "approved",
//         "rejected",
//       ],
//       default: "uploaded",
//       index: true,
//     },

//     customPrompt: { type: String, default: null },
//     deletedAt:    { type: Date, default: null },
//     submittedAt:  { type: Date, default: null },
//     reviewedAt:   { type: Date, default: null },
//     reviewedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     reviewNote: { type: String, default: null },

//     // ─── ANALYSIS RESULT ─────────────────────────────────────────────
//     analysisResult: {

//       // Existing fields (unchanged)
//       documentType:        { type: String, default: "Unknown" },
//       completenessScore:   { type: Number, default: 0 },
//       plainEnglishSummary: { type: String, default: "" },

//       documentOverview: {
//         documentType:    String,
//         madeBy:          String,
//         madeFor:         String,
//         purpose:         String,
//         sourceReference: String,   // ← NEW
//       },

//       // Existing + NEW passOrFail & sourceLocation per field
//       fieldByFieldExplanation: [
//         {
//           fieldName:           String,
//           value:               String,
//           plainEnglishMeaning: String,
//           plainEnglishValue:   String,
//           passOrFail:          String,   // ← NEW  "PASS" | "FAIL" | "N/A"
//           sourceLocation:      String,   // ← NEW
//         },
//       ],

//       // Existing + NEW sourceLocation per term
//       technicalTermsExplained: [
//         {
//           term:              String,
//           simpleExplanation: String,
//           sourceLocation:    String,   // ← NEW
//         },
//       ],

//       // Existing (unchanged)
//       unusualObservations: {
//         hasUnusualValues: { type: Boolean, default: false },
//         observations:     [String],
//         missingFields:    [String],
//       },

//       // ── NEW: Anonymised Data (Privacy Layer - Point 4) ──────────────
//       anonymisedData: {
//         sensitiveFieldsDetected: [
//           {
//             fieldName:            String,
//             originalValueMasked:  String,
//             sensitivityType:      String,
//             sourceLocation:       String,
//           },
//         ],
//         anonymisedDocumentSummary: { type: String, default: "" },
//       },

//       // ── NEW: Smart Summary (Point 5) ────────────────────────────────
//       smartSummary: {
//         objective:   { type: String, default: "" },
//         keyFindings: [String],
//         riskPoints:  [String],
//         actionItems: [String],
//       },

//       // ── NEW: Validation Report (Point 6) ────────────────────────────
//       validationReport: {
//         allRequiredFieldsPresent: { type: Boolean, default: true },
//         missingFields:            [String],
//         inconsistencies:          [String],
//         warnings:                 [String],
//         errorList:                [String],
//       },

//       // ── NEW: Classification & Priority (Point 8) ────────────────────
//       classificationAndPriority: {
//         category:            { type: String, default: "Routine" },
//         priorityLevel: {
//           type:    String,
//           enum:    ["High", "Medium", "Low"],
//           default: "Low",
//           index:   true,
//         },
//         priorityReason:      { type: String, default: "" },
//         recommendedAction: {
//           type:    String,
//           enum:    ["Approve", "Reject", "Flag for Review", "Re-test", "Escalate", "Archive"],
//           default: "Approve",
//         },
//       },

//       // ── NEW: Document Comparison (Point 7) ──────────────────────────
//       documentComparison: {
//         isComparisonAvailable: { type: Boolean, default: false },
//         comparedWithDocumentId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref:  "Document",
//           default: null,
//         },
//         changes: [
//           {
//             fieldName:    String,
//             oldValue:     String,
//             newValue:     String,
//             changeType:   String,  // "dosage" | "value" | "section" | "other"
//           },
//         ],
//       },

//       // ── NEW: Sources Cited ───────────────────────────────────────────
//       sourcesCited: [
//         {
//           dataPoint:      String,
//           sourceLocation: String,
//           extractedValue: String,
//         },
//       ],
//     },

//      gptResponse: {
//       rawMessage:   String,
//       structured:   mongoose.Schema.Types.Mixed,
//       model:        String,
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

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SCHEMAS (for clarity and reuse)
// ─────────────────────────────────────────────────────────────────────────────

const FieldExplanationSchema = new mongoose.Schema(
  {
    fieldName:           { type: String },   // Exact label from document
    value:               { type: String },   // Exact value from document
    specification:       { type: String },   // Acceptable range/spec stated in doc
    plainEnglishMeaning: { type: String },   // What the field name means simply
    plainEnglishValue:   { type: String },   // What the value means simply
    passOrFail:          { type: String, enum: ["PASS", "FAIL", "N/A"], default: "N/A" },
    sourceLocation:      { type: String },   // e.g. "Page 1, Test Table, Row 6"
  },
  { _id: true }
);

const TechnicalTermSchema = new mongoose.Schema(
  {
    term:              { type: String },
    simpleExplanation: { type: String },
    sourceLocation:    { type: String },
  },
  { _id: true }
);

const SensitiveFieldSchema = new mongoose.Schema(
  {
    fieldName:           { type: String },
    originalValueMasked: { type: String },   // e.g. "PP****" or "[REDACTED]"
    sensitivityType: {
      type: String,
      enum: [
        "Name",
        "Batch ID",
        "Report ID",
        "Patient ID",
        "Address",
        "Chemical Identifier",
        "Signature",
        "Other",
      ],
    },
    sourceLocation: { type: String },
  },
  { _id: true }
);

const DocumentChangeSchema = new mongoose.Schema(
  {
    fieldName:  { type: String },
    oldValue:   { type: String },
    newValue:   { type: String },
    changeType: {
      type: String,
      enum: ["dosage", "value", "section", "date", "other"],
      default: "other",
    },
  },
  { _id: true }
);

const SourceCitedSchema = new mongoose.Schema(
  {
    dataPoint:      { type: String },   // Field name or finding
    sourceLocation: { type: String },   // Page, section, row, column
    extractedValue: { type: String },   // Exact value pulled from that location
  },
  { _id: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DOCUMENT SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const DocumentSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── File Metadata ────────────────────────────────────────────────────────
    originalName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["pdf", "txt", "docx", "jpeg", "jpg", "png", "other"],
      default: "other",
    },
    fileSize:      { type: Number },                  // bytes
    extractedText: { type: String, default: "" },     // raw OCR / parsed text
    wordCount:     { type: Number, default: 0 },
    pageCount:     { type: Number, default: 1 },

    // ── Workflow Status ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "uploaded",          // file saved, not yet processed
        "processing",        // AI analysis running
        "analyzed",          // AI analysis complete
        "failed",            // processing error
        "deleted",           // soft-deleted
        "pending_review",    // submitted for human review
        "changes_requested", // reviewer sent back with notes
        "approved",          // reviewer approved
        "rejected",          // reviewer rejected
      ],
      default: "uploaded",
      index: true,
    },

    // ── Prompt & Soft-delete ─────────────────────────────────────────────────
    customPrompt: { type: String, default: null },
    deletedAt:    { type: Date,   default: null },
    submittedAt:  { type: Date,   default: null },

    // ── Review Fields ────────────────────────────────────────────────────────
    reviewedAt: { type: Date, default: null },
    blobUrl:      { type: String, default: null },
    blobFileName: { type: String, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewNote: { type: String, default: null },

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYSIS RESULT  (populated after AI processing)
    // ─────────────────────────────────────────────────────────────────────────
    analysisResult: {

      // ── Top-level quick-access fields (mirrors nested values for easy query) ─
      documentType:        { type: String, default: "Unknown" },
      completenessScore:   { type: Number, default: 0, min: 0, max: 100 },
      plainEnglishSummary: { type: String, default: "" },

      // ── 1. Document Overview ──────────────────────────────────────────────
      documentOverview: {
        documentType:    { type: String },   // "Certificate of Analysis", "Invoice" …
        madeBy:          { type: String },   // issuing organisation
        madeFor:         { type: String },   // recipient
        purpose:         { type: String },   // one-line purpose
        sourceReference: { type: String },   // "Page 1, Header section"
      },

      // ── 2. Field-by-Field Extraction ──────────────────────────────────────
      fieldByFieldExplanation: [FieldExplanationSchema],

      // ── 3. Technical Terms ────────────────────────────────────────────────
      technicalTermsExplained: [TechnicalTermSchema],

      // ── 4. Anonymised Data (Privacy Layer) ───────────────────────────────
      anonymisedData: {
        sensitiveFieldsDetected:   [SensitiveFieldSchema],
        anonymisedDocumentSummary: { type: String, default: "" },
      },

      // ── 5. Smart Summary ─────────────────────────────────────────────────
      smartSummary: {
        objective:   { type: String, default: "" },
        keyFindings: [{ type: String }],
        riskPoints:  [{ type: String }],
        actionItems: [{ type: String }],
      },

      // ── 6. Validation & Completeness ─────────────────────────────────────
      validationReport: {
        allRequiredFieldsPresent: { type: Boolean, default: true },
        missingFields:            [{ type: String }],
        inconsistencies:          [{ type: String }],
        warnings:                 [{ type: String }],
        errorList:                [{ type: String }],
      },

      // ── 6b. Unusual Observations (kept for backward compat + UI display) ──
      unusualObservations: {
        hasUnusualValues: { type: Boolean, default: false },
        observations:     [{ type: String }],
        missingFields:    [{ type: String }],  // mirrors validationReport.missingFields
      },

      // ── 7. Document Comparison ────────────────────────────────────────────
      documentComparison: {
        isComparisonAvailable: { type: Boolean, default: false },
        comparedWithDocumentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
          default: null,
        },
        changes: [DocumentChangeSchema],
      },

      // ── 8. Classification & Priority ─────────────────────────────────────
      classificationAndPriority: {
        category: {
          type: String,
          enum: [
            "Death",
            "Hospitalisation",
            "Adverse Event",
            "Quality Failure",
            "Compliance Issue",
            "Regulatory Submission",
            "Routine Quality Check",
            "Other",
          ],
          default: "Other",
        },
        priorityLevel: {
          type: String,
          enum: ["High", "Medium", "Low"],
          default: "Low",
          index: true,
        },
        priorityReason:    { type: String, default: "" },
        recommendedAction: {
          type: String,
          enum: [
            "Approve",
            "Reject",
            "Flag for Review",
            "Re-test Required",
            "Escalate to Senior Reviewer",
            "Archive",
          ],
          default: "Approve",
        },
      },

      // ── 9. Sources Cited (every field traced back to document location) ───
      sourcesCited: [SourceCitedSchema],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // RAW GPT / AI RESPONSE  (stored for audit + debugging)
    // ─────────────────────────────────────────────────────────────────────────
    gptResponse: {
      rawMessage:   { type: String },                        // full raw string from API
      structured:   { type: mongoose.Schema.Types.Mixed },  // parsed JSON object
      model:        { type: String },                        // e.g. "gpt-4o-2024-11-20"
      tokens: {
        prompt:     { type: Number },
        completion: { type: Number },
        total:      { type: Number },
      },
      finishReason: { type: String },                        // "stop" | "length" | etc.
    },
  },
  {
    timestamps: true,   // adds createdAt + updatedAt automatically
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES  (for dashboard queries, priority queues, audit filters)
// ─────────────────────────────────────────────────────────────────────────────
DocumentSchema.index({ userId: 1, status: 1 });
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ "analysisResult.classificationAndPriority.priorityLevel": 1, status: 1 });
DocumentSchema.index({ deletedAt: 1 }, { sparse: true });

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL — human-readable file size
// ─────────────────────────────────────────────────────────────────────────────
DocumentSchema.virtual("fileSizeFormatted").get(function () {
  if (!this.fileSize) return "Unknown";
  if (this.fileSize < 1024) return `${this.fileSize} B`;
  if (this.fileSize < 1048576) return `${(this.fileSize / 1024).toFixed(1)} KB`;
  return `${(this.fileSize / 1048576).toFixed(1)} MB`;
});

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL — quick pass/fail summary count
// ─────────────────────────────────────────────────────────────────────────────
DocumentSchema.virtual("passFailCount").get(function () {
  const fields = this.analysisResult?.fieldByFieldExplanation || [];
  return {
    pass: fields.filter((f) => f.passOrFail === "PASS").length,
    fail: fields.filter((f) => f.passOrFail === "FAIL").length,
    na:   fields.filter((f) => f.passOrFail === "N/A").length,
    total: fields.length,
  };
});

module.exports = mongoose.model("Document", DocumentSchema);
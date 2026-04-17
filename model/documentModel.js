const mongoose = require("mongoose");

const PeakSchema = new mongoose.Schema(
  {
    srNo: { type: Number, default: 0 },
    retentionTime: { type: Number, default: 0 },
    area: { type: Number, default: 0 },
    areaPercent: { type: Number, default: 0 },
    symmetry: { type: Number, default: null },
  },
  { _id: false },
);

const SupportingDataSchema = new mongoose.Schema(
  {
    dataType: { type: String, default: "" },
    sampleName: { type: String, default: "" },
    operator: { type: String, default: "" },
    injectionDate: { type: String, default: "" },
    runTime: { type: String, default: "" },
    method: { type: String, default: "" },
    peaks: { type: [PeakSchema], default: [] },
  },
  { _id: false },
);

const FieldSchema = new mongoose.Schema(
  {
    fieldName: { type: String, default: "" },
    value: { type: String, default: "" },
    unit: { type: String, default: null },
    specification: { type: String, default: null },
    passOrFail: {
      type: String,
      enum: [
        "PASS",
        "FAIL",
        "WARNING",
        "CRITICAL_WARNING",
        "NOT_DETECTED",
        "N/A",
        "INFO",
      ],
      default: "N/A",
    },
    percentageOfLimit: { type: String, default: "N/A" },
    plainEnglishMeaning: { type: String, default: "" }, // ← NEW
    plainEnglishValue: { type: String, default: "" }, // ← NEW
    sourceLocation: { type: String, default: "" },
    sourceUrl: { type: String, default: null }, // ← NEW — live URL
    riskFlag: { type: Boolean, default: false },
    isCritical: { type: Boolean, default: false },
  },
  { _id: true },
);

const TestResultSchema = new mongoose.Schema(
  {
    srNo: { type: String, default: "" },
    parameterName: { type: String, default: "" },
    specification: { type: String, default: null },
    result: { type: String, default: "" },
    unit: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "PASS",
        "FAIL",
        "WARNING",
        "CRITICAL_WARNING",
        "NOT_DETECTED",
        "INFO",
        "N/A",
      ],
      default: "N/A",
    },
    percentageOfLimit: { type: String, default: "N/A" },
    plainEnglishTest: { type: String, default: "" },
    plainEnglishResult: { type: String, default: "" },
    isSeriousConcern: { type: Boolean, default: false },
    sourceLocation: { type: String, default: "" },
    sourceUrl: { type: String, default: null }, // ← NEW
  },
  { _id: false },
);

const SignatureSchema = new mongoose.Schema(
  {
    preparedBy: { type: String, default: null },
    checkedBy: { type: String, default: null },
    reviewedBy: { type: String, default: null },
    approvedBy: { type: String, default: null },
    signedDate: { type: String, default: null },
  },
  { _id: false },
);

const ValidationSchema = new mongoose.Schema(
  {
    completenessScore: { type: Number, default: 0 },
    allChecksPassed: { type: Boolean, default: true },
    overallVerdict: {
      type: String,
      enum: [
        "COMPLIES",
        "DOES_NOT_COMPLY",
        "INCOMPLETE",
        "REQUIRES_REVIEW",
        "PASS",
        "FAIL",
        "PASS_WITH_OBSERVATIONS",
        "PARTIAL",
        "UNREADABLE",
      ],
      default: "COMPLIES",
    },
    verdictReason: { type: String, default: "" },
    failedItems: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    criticalErrors: { type: [String], default: [] },
  },
  { _id: false },
);

const AlertSchema = new mongoose.Schema(
  {
    alertLevel: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      default: "LOW",
    },
    alertTitle: { type: String, default: "" },
    alertDetail: { type: String, default: "" },
    affectedField: { type: String, default: "" },
    recommendedAction: { type: String, default: "" },
    sourceUrl: { type: String, default: null }, // ← NEW
  },
  { _id: false },
);

const RegulatoryRefSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    relevance: { type: String, default: "" },
    url: { type: String, default: null }, // ← live URL
  },
  { _id: false },
);

const SingleDocumentSchema = new mongoose.Schema(
  {
    docIndex: { type: Number, required: true },
    casNumber: { type: String, default: null },
    batchSize: { type: String, default: null },
    mfgDate: { type: String, default: null },
    retestDate: { type: String, default: null },
    mfgLicNo: { type: String, default: null },
    documentType: { type: String, default: "OTHER" },
    documentTitle: { type: String, default: "" },
    issuedBy: { type: String, default: "" },
    issuedTo: { type: String, default: "" },
    documentDate: { type: String, default: "" },
    documentId: { type: String, default: "" },
    pageRange: { type: String, default: "" },
    conclusion: { type: String, default: "" },
    storageCondition: { type: String, default: "" },
    remarks: { type: String, default: "" },
    fields: { type: [FieldSchema], default: [] },
    testResults: { type: [TestResultSchema], default: [] },
    supportingData: { type: [SupportingDataSchema], default: [] },
    signatures: { type: SignatureSchema, default: () => ({}) },
    validation: { type: ValidationSchema, default: () => ({}) },
    sensitiveData: [
      {
        fieldName: { type: String, default: "" },
        maskedValue: { type: String, default: "" },
        sensitivityType: { type: String, default: "" },
        sourceLocation: { type: String, default: "" },
        _id: false,
      },
    ],
    chunkIndices: { type: [Number], default: [] },
    keyRegulatoryReferences: { type: [RegulatoryRefSchema], default: [] },
  },
  { _id: true },
);

const ComparisonResultSchema = new mongoose.Schema(
  {
    docIndex: { type: Number },
    documentId: { type: String, default: "" },
    value: { type: String, default: "" },
    passOrFail: { type: String, default: "N/A" },
  },
  { _id: false },
);

const FieldComparisonSchema = new mongoose.Schema(
  {
    fieldName: { type: String, default: "" },
    specification: { type: String, default: "" },
    specConsistent: { type: Boolean, default: true },
    results: { type: [ComparisonResultSchema], default: [] },
    trend: {
      type: String,
      enum: ["STABLE", "IMPROVING", "DEGRADING", "VARIABLE", "N/A"],
      default: "N/A",
    },
    varianceFlag: { type: Boolean, default: false },
  },
  { _id: false },
);

const EntitySummarySchema = new mongoose.Schema(
  {
    docIndex: { type: Number },
    documentId: { type: String, default: "" },
    date: { type: String, default: "" },
    overallVerdict: { type: String, default: "" },
    completenessScore: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    warnCount: { type: Number, default: 0 },
    criticalCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const RiskItemSchema = new mongoose.Schema(
  {
    riskId: { type: String, default: "" },
    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      default: "LOW",
    },
    category: {
      type: String,
      enum: [
        "Quality",
        "Regulatory",
        "Safety",
        "Commercial",
        "Data Integrity",
        "Completeness",
      ],
      default: "Quality",
    },
    description: { type: String, default: "" },
    affectedDocuments: { type: [Number], default: [] },
    affectedFields: { type: [String], default: [] },
    sourceLocation: { type: String, default: "" },
    recommendation: { type: String, default: "" },
    sourceUrl: { type: String, default: null },
  },
  { _id: true },
);

const SourceCitationSchema = new mongoose.Schema(
  {
    citationId: { type: String, default: "" },
    dataPoint: { type: String, default: "" },
    docIndex: { type: Number, default: 1 },
    pageNumber: { type: String, default: "" },
    sectionName: { type: String, default: "" },
    rowOrPosition: { type: String, default: "" },
    extractedValue: { type: String, default: "" },
    sourceUrl: { type: String, default: null },
  },
  { _id: false },
);

const GlossaryTermSchema = new mongoose.Schema(
  {
    term: { type: String, default: "" },
    simpleExplanation: { type: String, default: "" },
  },
  { _id: false },
);

const AnalysisResultSchema = new mongoose.Schema(
  {
    documentSetType: {
      type: String,
      enum: ["SINGLE", "MULTI"],
      default: "SINGLE",
    },
    documentCount: { type: Number, default: 1 },
    documentType: {
      type: String,
      enum: [
        "COA",
        "INVOICE",
        "LEGAL_CONTRACT",
        "MEDICAL_RECORD",
        "LAB_REPORT",
        "FINANCIAL",
        "MIXED",
        "OTHER",
        "SAE_REPORT",
        "REGULATORY",
      ],
      default: "OTHER",
    },
    completenessScore: { type: Number, default: 0, min: 0, max: 100 },
    totalPages: { type: Number, default: 1 },
    totalChunksProcessed: { type: Number, default: 0 },

    documentOverview: {
      documentType: { type: String, default: "" },
      madeBy: { type: String, default: "" },
      madeFor: { type: String, default: "" },
      purpose: { type: String, default: "" },
      coversPeriod: { type: String, default: "" },
      uniqueProducts: { type: [String], default: [] },
      uniqueBatches: { type: [String], default: [] },
      jurisdiction: { type: String, default: "" },
    },

    documents: { type: [SingleDocumentSchema], default: [] },

    comparison: {
      isAvailable: { type: Boolean, default: false },
      entitySummaryTable: { type: [EntitySummarySchema], default: [] },
      fieldComparison: { type: [FieldComparisonSchema], default: [] },
      crossDocumentInsights: { type: [String], default: [] },
    },

    riskAnalysis: {
      overallRiskLevel: {
        type: String,
        enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        default: "LOW",
      },
      riskItems: { type: [RiskItemSchema], default: [] },
    },

    sourceCitations: { type: [SourceCitationSchema], default: [] },

    smartSummary: {
      objective: { type: String, default: "" },
      scope: { type: String, default: "" },
      keyFindings: { type: [String], default: [] },
      riskSummary: { type: String, default: "" },
      actionItems: { type: [String], default: [] },
      overallConclusion: { type: String, default: "" },
      plainEnglishSummary: { type: String, default: "" },
      technicalGlossary: { type: [GlossaryTermSchema], default: [] },
    },

    keyRegulatoryReferences: { type: [RegulatoryRefSchema], default: [] },

    classificationAndPriority: {
      category: {
        type: String,
        enum: [
          "Quality Failure",
          "Routine Quality Check",
          "Compliance Issue",
          "Regulatory Submission",
          "Adverse Event",
          "Commercial",
          "Other",
        ],
        default: "Routine Quality Check",
      },
      priorityLevel: {
        type: String,
        enum: ["High", "Medium", "Low"],
        default: "Low",
        index: true,
      },
      priorityReason: { type: String, default: "" },
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

    plainEnglishSummary: { type: String, default: "" },
    documentRisk: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "LOW",
    },
    unusualObservations: {
      hasUnusualValues: { type: Boolean, default: false },
      observations: { type: [String], default: [] },
      missingFields: { type: [String], default: [] },
    },
    validationReport: {
      completenessScore: { type: Number, default: 0 },
      allRequiredFieldsPresent: { type: Boolean, default: true },
      missingFields: { type: [String], default: [] },
      inconsistencies: { type: [String], default: [] },
      warnings: { type: [String], default: [] },
      errorList: { type: [String], default: [] },
    },
  },
  { _id: false },
);

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
      enum: ["pdf", "txt", "docx", "jpeg", "jpg", "png", "other"],
      default: "other",
    },
    fileSize: { type: Number },
    extractedText: { type: String, default: "" },
    wordCount: { type: Number, default: 0 },
    pageCount: { type: Number, default: 1 },
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
    blobUrl: { type: String, default: null },
    blobFileName: { type: String, default: null },
    analysisResult: { type: AnalysisResultSchema, default: () => ({}) },
    gptResponse: {
      rawMessage: { type: String },
      structured: { type: mongoose.Schema.Types.Mixed },
      model: { type: String },
      tokens: { prompt: Number, completion: Number, total: Number },
      finishReason: { type: String },
    },
  },
  { timestamps: true },
);

DocumentSchema.index({ userId: 1, status: 1, createdAt: -1 });
DocumentSchema.index({ "analysisResult.documentRisk": 1, status: 1 });
DocumentSchema.index({ deletedAt: 1 }, { sparse: true });

module.exports = mongoose.model("Document", DocumentSchema);

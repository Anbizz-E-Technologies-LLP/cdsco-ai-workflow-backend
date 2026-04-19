 const mongoose = require("mongoose");

const PeakSchema = new mongoose.Schema({
  srNo: { type: Number, default: 0 },
  retentionTime: { type: Number, default: 0 },
  area: { type: Number, default: 0 },
  areaPercent: { type: Number, default: 0 },
  symmetry: { type: Number, default: null },
}, { _id: false });

const SupportingDataSchema = new mongoose.Schema({
  dataType: { type: String, default: "" },
  sampleName: { type: String, default: "" },
  operator: { type: String, default: "" },
  injectionDate: { type: String, default: "" },
  runTime: { type: String, default: "" },
  method: { type: String, default: "" },
  peaks: { type: [PeakSchema], default: [] },
}, { _id: false });

const FieldSchema = new mongoose.Schema({
  fieldName: { type: String, default: "" },
  value: { type: String, default: "" },
  unit: { type: String, default: null },
  specification: { type: String, default: null },
  passOrFail: {
    type: String,
    enum: ["PASS","FAIL","WARNING","CRITICAL_WARNING","NOT_DETECTED","N/A","INFO"],
    default: "N/A",
  },
  percentageOfLimit: { type: String, default: "N/A" },
  plainEnglishMeaning: { type: String, default: "" },
  plainEnglishValue: { type: String, default: "" },
  sourceLocation: { type: String, default: "" },
  sourceUrl: { type: String, default: null },
  riskFlag: { type: Boolean, default: false },
  isCritical: { type: Boolean, default: false },
}, { _id: true });

const TestResultSchema = new mongoose.Schema({
  srNo: { type: String, default: "" },
  parameterName: { type: String, default: "" },
  specification: { type: String, default: null },
  result: { type: String, default: "" },
  unit: { type: String, default: null },
  status: {
    type: String,
    enum: ["PASS","FAIL","WARNING","CRITICAL_WARNING","NOT_DETECTED","INFO","N/A"],
    default: "N/A",
  },
  percentageOfLimit: { type: String, default: "N/A" },
  plainEnglishTest: { type: String, default: "" },
  plainEnglishResult: { type: String, default: "" },
  isSeriousConcern: { type: Boolean, default: false },
  sourceLocation: { type: String, default: "" },
  sourceUrl: { type: String, default: null },
}, { _id: false });

const SignatureSchema = new mongoose.Schema({
  preparedBy: { type: String, default: null },
  checkedBy: { type: String, default: null },
  reviewedBy: { type: String, default: null },
  approvedBy: { type: String, default: null },
  signedDate: { type: String, default: null },
}, { _id: false });

const ValidationSchema = new mongoose.Schema({
  completenessScore: { type: Number, default: 0 },
  allChecksPassed: { type: Boolean, default: true },
  overallVerdict: {
    type: String,
    enum: ["COMPLIES","DOES_NOT_COMPLY","INCOMPLETE","REQUIRES_REVIEW","PASS","FAIL",
           "PASS_WITH_OBSERVATIONS","PARTIAL","UNREADABLE"],
    default: "COMPLIES",
  },
  verdictReason: { type: String, default: "" },
  failedItems: { type: [String], default: [] },
  warnings: { type: [String], default: [] },
  criticalErrors: { type: [String], default: [] },
}, { _id: false });

const RegulatoryRefSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  relevance: { type: String, default: "" },
  url: { type: String, default: null },
}, { _id: false });

const SingleDocumentSchema = new mongoose.Schema({
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
  sensitiveData: [{
    fieldName: { type: String, default: "" },
    maskedValue: { type: String, default: "" },
    sensitivityType: { type: String, default: "" },
    sourceLocation: { type: String, default: "" },
    _id: false,
  }],
  chunkIndices: { type: [Number], default: [] },
  keyRegulatoryReferences: { type: [RegulatoryRefSchema], default: [] },
}, { _id: true });

 
 const StabilityTimepointResultSchema = new mongoose.Schema({
  testName: { type: String, default: "" },
  specification: { type: String, default: null },
  unit: { type: String, default: null },
  
  timepoints: { type: mongoose.Schema.Types.Mixed, default: {} },
  trend: {
    type: String,
    enum: ["STABLE","IMPROVING","DEGRADING","VARIABLE"],
    default: "STABLE",
  },
  lowestValue: { type: mongoose.Schema.Types.Mixed, default: null },
  highestValue: { type: mongoose.Schema.Types.Mixed, default: null },
  worstPctOfLimit: { type: mongoose.Schema.Types.Mixed, default: null },
  allPass: { type: Boolean, default: true },
  outOfTrend: { type: Boolean, default: false },
  alertLevel: {
    type: String,
    enum: ["NONE","LOW","MEDIUM","HIGH","CRITICAL"],
    default: "NONE",
  },
}, { _id: false });

 const StabilityMatrixEntrySchema = new mongoose.Schema({
  batchNumber: { type: String, required: false, default: '' },
  condition: { type: String, default: "" },
  conditionType: {
    type: String,
    enum: ["LONG_TERM","ACCELERATED","INTERMEDIATE","REFRIGERATED","OTHER"],
    default: "LONG_TERM",
  },
  timepointsAvailable: { type: [Number], default: [] },
  overallStatus: {
    type: String,
    enum: ["PASS","FAIL","PASS_WITH_OBSERVATIONS","PARTIAL"],
    default: "PASS",
  },
  results: { type: [StabilityTimepointResultSchema], default: [] },
}, { _id: false });

// One row in the batch manifest table
const MasterBatchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: false, default: '' },
  manufacturer: { type: String, default: "" },
  dateOfManufacture: { type: String, default: null },
  beginningOfStability: { type: String, default: null },
  batchSizeKg: { type: Number, default: null },
  batchType: {
    type: String,
    enum: ["PILOT","PRODUCTION","CLINICAL","OTHER"],
    default: "PRODUCTION",
  },
  overallStatus: {
    type: String,
    enum: ["PASS","FAIL","PASS_WITH_OBSERVATIONS","PARTIAL"],
    default: "PASS",
  },
  conditionsTested: { type: [String], default: [] },
  maxTimepoint: { type: Number, default: null },
}, { _id: false });

const StudyProtocolConditionSchema = new mongoose.Schema({
  condition: { type: String, default: "" },
  type: {
    type: String,
    enum: ["ACCELERATED","LONG_TERM","INTERMEDIATE","OTHER"],
    default: "LONG_TERM",
  },
  timepoints: { type: [Number], default: [] },
}, { _id: false });

const StudyProtocolTestSchema = new mongoose.Schema({
  testName: { type: String, default: "" },
  acceptanceCriteria: { type: String, default: "" },
  analyticalMethod: { type: String, default: "" },
}, { _id: false });

// ── COMPARISON / RISK / CITATION SCHEMAS ──────────────────────────────────────

const ComparisonResultSchema = new mongoose.Schema({
  docIndex: { type: Number },
  documentId: { type: String, default: "" },
  value: { type: String, default: "" },
  passOrFail: { type: String, default: "N/A" },
}, { _id: false });

const FieldComparisonSchema = new mongoose.Schema({
  fieldName: { type: String, default: "" },
  specification: { type: String, default: "" },
  specConsistent: { type: Boolean, default: true },
  results: { type: [ComparisonResultSchema], default: [] },
  trend: {
    type: String,
    enum: ["STABLE","IMPROVING","DEGRADING","VARIABLE","N/A"],
    default: "N/A",
  },
  varianceFlag: { type: Boolean, default: false },
}, { _id: false });

const EntitySummarySchema = new mongoose.Schema({
  docIndex: { type: Number },
  documentId: { type: String, default: "" },
  date: { type: String, default: "" },
  overallVerdict: { type: String, default: "" },
  completenessScore: { type: Number, default: 0 },
  failCount: { type: Number, default: 0 },
  warnCount: { type: Number, default: 0 },
  criticalCount: { type: Number, default: 0 },
}, { _id: false });

const RiskItemSchema = new mongoose.Schema({
  riskId: { type: String, default: "" },
  severity: {
    type: String,
    enum: ["CRITICAL","HIGH","MEDIUM","LOW"],
    default: "LOW",
  },
  category: {
    type: String,
    enum: ["Quality","Regulatory","Safety","Commercial","Data Integrity","Completeness"],
    default: "Quality",
  },
  description: { type: String, default: "" },
  affectedDocuments: { type: [Number], default: [] },
  affectedFields: { type: [String], default: [] },
  sourceLocation: { type: String, default: "" },
  recommendation: { type: String, default: "" },
  sourceUrl: { type: String, default: null },
}, { _id: true });

const SourceCitationSchema = new mongoose.Schema({
  citationId: { type: String, default: "" },
  dataPoint: { type: String, default: "" },
  docIndex: { type: Number, default: 1 },
  pageNumber: { type: String, default: "" },
  sectionName: { type: String, default: "" },
  rowOrPosition: { type: String, default: "" },
  extractedValue: { type: String, default: "" },
  sourceUrl: { type: String, default: null },
}, { _id: false });

const GlossaryTermSchema = new mongoose.Schema({
  term: { type: String, default: "" },
  simpleExplanation: { type: String, default: "" },
}, { _id: false });

// ── MAIN ANALYSIS RESULT SCHEMA ───────────────────────────────────────────────

const AnalysisResultSchema = new mongoose.Schema({
  documentSetType: { type: String, enum: ["SINGLE","MULTI"], default: "SINGLE" },
  documentCount: { type: Number, default: 1 },
  documentType: {
    type: String,
    enum: ["COA","STABILITY_REPORT","STABILITY_SUMMARY","MONTHLY_REPORT","MIXED","INVOICE","LEGAL_CONTRACT",
           "MEDICAL_RECORD","LAB_REPORT","FINANCIAL","OTHER","SAE_REPORT","REGULATORY"],
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

  // ── COA / standard documents ───────────────────────────────────────────────
  documents: { type: [SingleDocumentSchema], default: [] },

  // ── STABILITY REPORT specific fields ──────────────────────────────────────
  // All 15 (or N) batches from the batch manifest table
  masterBatchList: { type: [MasterBatchSchema], default: [] },

  // Complete timepoint matrix: one entry per batch × condition
  // e.g. 15 batches × 2 conditions = up to 30 entries
  stabilityMatrix: { type: [StabilityMatrixEntrySchema], default: [] },

  // Study design (conditions tested, timepoints, acceptance criteria)
  studyProtocol: {
    conditions: { type: [StudyProtocolConditionSchema], default: [] },
    testParameters: { type: [StudyProtocolTestSchema], default: [] },
  },

  // Branch/MIS report fields
  branchList: { type: [mongoose.Schema.Types.Mixed], default: [] },
  companySummary: { type: mongoose.Schema.Types.Mixed, default: null },

  // ── Comparison ─────────────────────────────────────────────────────────────
  comparison: {
    isAvailable: { type: Boolean, default: false },
    entitySummaryTable: { type: [EntitySummarySchema], default: [] },
    fieldComparison: { type: [FieldComparisonSchema], default: [] },
    crossDocumentInsights: { type: [String], default: [] },
  },

  riskAnalysis: {
    overallRiskLevel: {
      type: String,
      enum: ["CRITICAL","HIGH","MEDIUM","LOW"],
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
      enum: ["Quality Failure","Routine Quality Check","Compliance Issue",
             "Regulatory Submission","Adverse Event","Commercial","Other"],
      default: "Routine Quality Check",
    },
    priorityLevel: { type: String, enum: ["High","Medium","Low"], default: "Low", index: true },
    priorityReason: { type: String, default: "" },
    recommendedAction: {
      type: String,
      enum: ["Approve","Reject","Flag for Review","Re-test Required",
             "Escalate to Senior Reviewer","Archive"],
      default: "Approve",
    },
  },

  plainEnglishSummary: { type: String, default: "" },
  documentRisk: { type: String, enum: ["HIGH","MEDIUM","LOW"], default: "LOW" },
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
}, { _id: false });

// ── MAIN DOCUMENT SCHEMA ──────────────────────────────────────────────────────

const DocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  originalName: { type: String, required: true },
  fileType: {
    type: String,
    enum: ["pdf","txt","docx","jpeg","jpg","png","other"],
    default: "other",
  },
  fileSize: { type: Number },
  extractedText: { type: String, default: "" },
  wordCount: { type: Number, default: 0 },
  pageCount: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ["uploaded","processing","analyzed","failed","deleted",
           "pending_review","changes_requested","approved","rejected"],
    default: "uploaded",
    index: true,
  },
  customPrompt: { type: String, default: null },
  deletedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
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
}, { timestamps: true });

DocumentSchema.index({ userId: 1, status: 1, createdAt: -1 });
DocumentSchema.index({ "analysisResult.documentRisk": 1, status: 1 });
DocumentSchema.index({ deletedAt: 1 }, { sparse: true });
// Stability-specific indexes
DocumentSchema.index({ "analysisResult.masterBatchList.batchNumber": 1 });
DocumentSchema.index({ "analysisResult.stabilityMatrix.batchNumber": 1 });

module.exports = mongoose.model("Document", DocumentSchema);
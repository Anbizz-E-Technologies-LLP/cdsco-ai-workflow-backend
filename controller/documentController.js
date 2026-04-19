// controllers/documentController.js

const Document   = require("../model/documentModel");
const { analyzeDocument, openaiClient } = require("../services/aiService");
const { extractText }      = require("../services/textExtractor");
const { sendNotification } = require("./notificationController");
const User       = require("../model/addUserModel");
const { Types }  = require("mongoose");
const { uploadToAzureBlob, deleteFromAzureBlob, generateSasUrl } = require("../utils/blobUpload");

function detectFileType(originalname = "", mimetype = "") {
  const name = (originalname || "").toLowerCase();
  const mime = (mimetype || "").toLowerCase();
  if (name.endsWith(".pdf")  || mime === "application/pdf")                         return "pdf";
  if (name.endsWith(".docx") || mime.includes("wordprocessingml"))                   return "docx";
  if (name.endsWith(".txt")  || mime === "text/plain")                               return "txt";
  if (/\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(name) || mime.startsWith("image/")) return "image";
  return "pdf";
}

function toDbFileType(type) {
  return { pdf:"pdf", docx:"docx", txt:"txt" }[type] || "other";
}

function mapToAnalysisResult(s) {
  if (!s || typeof s !== "object") return {};
  const safeArr  = (v)          => Array.isArray(v) ? v : [];
  const safeStr  = (v, fb="")   => v != null ? String(v) : fb;
  const safeBool = (v, fb=false)=> typeof v === "boolean" ? v : fb;
  const safeNum  = (v, fb=0)    => (typeof v === "number" && isFinite(v)) ? v : fb;
  const safeEnum = (v,arr,fb)   => arr.includes(v) ? v : fb;

  const vVerdict  = ["COMPLIES","DOES_NOT_COMPLY","INCOMPLETE","REQUIRES_REVIEW"];
  const vSeverity = ["CRITICAL","HIGH","MEDIUM","LOW"];
  const vCategory = ["Quality","Regulatory","Safety","Commercial","Data Integrity","Completeness"];
  const vTrend    = ["STABLE","IMPROVING","DEGRADING","VARIABLE","N/A"];
  const vPF       = ["PASS","FAIL","N/A","WARNING","CRITICAL_WARNING","NOT_DETECTED","INFO"];
  const vCatCl    = ["Quality Failure","Routine Quality Check","Compliance Issue","Regulatory Submission","Adverse Event","Commercial","Other"];
  const vPriority = ["High","Medium","Low"];
  const vAction   = ["Approve","Reject","Flag for Review","Re-test Required","Escalate to Senior Reviewer","Archive"];
  const vDocType  = ["COA","STABILITY_REPORT","STABILITY_SUMMARY","MONTHLY_REPORT","SAE_REPORT","INVOICE","LEGAL_CONTRACT","REGULATORY","MEDICAL_RECORD","LAB_REPORT","FINANCIAL","MIXED","OTHER"];
  const vConc     = ["COMPLIES","DOES_NOT_COMPLY","INCOMPLETE","REQUIRES_REVIEW","PASS","FAIL","PASS_WITH_OBSERVATIONS","PARTIAL","UNREADABLE"];

  return {
    documentSetType:      safeEnum(s.documentSetType,["SINGLE","MULTI"],"SINGLE"),
    documentCount:        safeNum(s.documentCount,1),
    documentType:         safeEnum(s.documentType,vDocType,"OTHER"),
    completenessScore:    Math.min(100,Math.max(0,safeNum(s.completenessScore,0))),
    totalPages:           safeNum(s.totalPages,1),
    totalChunksProcessed: safeNum(s.totalChunksProcessed,0),
    documentOverview: {
      documentType:   safeStr(s.documentOverview?.documentType),
      madeBy:         safeStr(s.documentOverview?.madeBy),
      madeFor:        safeStr(s.documentOverview?.madeFor),
      purpose:        safeStr(s.documentOverview?.purpose),
      coversPeriod:   safeStr(s.documentOverview?.coversPeriod),
      uniqueProducts: safeArr(s.documentOverview?.uniqueProducts).map(String),
      uniqueBatches:  safeArr(s.documentOverview?.uniqueBatches).map(String),
      jurisdiction:   safeStr(s.documentOverview?.jurisdiction),
    },
    documents: safeArr(s.documents).map((d,i) => ({
      docIndex: safeNum(d.docIndex,i+1), documentType: safeStr(d.documentType,"OTHER"),
      documentTitle: safeStr(d.documentTitle), issuedBy: safeStr(d.issuedBy),
      issuedTo: safeStr(d.issuedTo), documentDate: safeStr(d.documentDate),
      documentId: safeStr(d.documentId), pageRange: safeStr(d.pageRange),
      chunkIndices: safeArr(d.chunkIndices).map(Number),
      storageCondition: safeStr(d.storageCondition),
      conclusion: safeEnum(d.conclusion,vConc,"REQUIRES_REVIEW"),
      remarks: safeStr(d.remarks),
      fields: safeArr(d.fields).map(f => ({
        fieldName: safeStr(f.fieldName), value: safeStr(f.value),
        unit: f.unit != null ? safeStr(f.unit) : null,
        specification: f.specification != null ? safeStr(f.specification) : null,
        passOrFail: safeEnum(f.passOrFail,vPF,"N/A"),
        percentageOfLimit: safeStr(f.percentageOfLimit ?? "N/A"),
        plainEnglishMeaning: safeStr(f.plainEnglishMeaning || ""),
        plainEnglishValue:   safeStr(f.plainEnglishValue || ""),
        sourceLocation: safeStr(f.sourceLocation),
        sourceUrl: f.sourceUrl != null ? safeStr(f.sourceUrl) : null,
        riskFlag: safeBool(f.riskFlag), isCritical: safeBool(f.isCritical),
      })),
      testResults: safeArr(d.testResults).map(t => ({
        srNo: safeStr(t.srNo || ""), parameterName: safeStr(t.parameterName || t.fieldName || ""),
        specification: t.specification != null ? safeStr(t.specification) : null,
        result: safeStr(t.result || t.value || ""),
        unit: t.unit != null ? safeStr(t.unit) : null,
        status: safeEnum(t.status || t.passOrFail, vPF, "N/A"),
        percentageOfLimit: safeStr(t.percentageOfLimit ?? "N/A"),
        plainEnglishTest:   safeStr(t.plainEnglishTest || t.plainEnglishMeaning || ""),
        plainEnglishResult: safeStr(t.plainEnglishResult || t.plainEnglishValue || ""),
        isSeriousConcern: safeBool(t.isSeriousConcern || t.isCritical, false),
        sourceLocation: safeStr(t.sourceLocation || ""),
        sourceUrl: t.sourceUrl != null ? safeStr(t.sourceUrl) : null,
      })),
      supportingData: safeArr(d.supportingData).map(sd => ({
        dataType: safeStr(sd.dataType), sampleName: safeStr(sd.sampleName),
        operator: safeStr(sd.operator), injectionDate: safeStr(sd.injectionDate),
        runTime: safeStr(sd.runTime), method: safeStr(sd.method),
        peaks: safeArr(sd.peaks).map(p => ({
          srNo: safeNum(p.srNo), retentionTime: safeNum(p.retentionTime),
          area: safeNum(p.area), areaPercent: safeNum(p.areaPercent),
          symmetry: p.symmetry != null ? safeNum(p.symmetry) : null,
        })),
      })),
      signatures: {
        preparedBy: d.signatures?.preparedBy != null ? safeStr(d.signatures.preparedBy) : null,
        checkedBy:  d.signatures?.checkedBy  != null ? safeStr(d.signatures.checkedBy)  : null,
        reviewedBy: d.signatures?.reviewedBy != null ? safeStr(d.signatures.reviewedBy) : null,
        approvedBy: d.signatures?.approvedBy != null ? safeStr(d.signatures.approvedBy) : null,
        signedDate: d.signatures?.signedDate != null ? safeStr(d.signatures.signedDate) : null,
      },
      sensitiveData: safeArr(d.sensitiveData).map(sd => ({
        fieldName: safeStr(sd.fieldName), maskedValue: safeStr(sd.maskedValue),
        sensitivityType: safeStr(sd.sensitivityType), sourceLocation: safeStr(sd.sourceLocation),
      })),
      validation: {
        completenessScore: Math.min(100,Math.max(0,safeNum(d.validation?.completenessScore,0))),
        allChecksPassed:   safeBool(d.validation?.allChecksPassed,true),
        overallVerdict:    safeEnum(d.validation?.overallVerdict,vVerdict,"COMPLIES"),
        verdictReason:     safeStr(d.validation?.verdictReason),
        failedItems:       safeArr(d.validation?.failedItems).map(String),
        warnings:          safeArr(d.validation?.warnings).map(String),
        criticalErrors:    safeArr(d.validation?.criticalErrors).map(String),
      },
    })),
    comparison: {
      isAvailable: safeBool(s.comparison?.isAvailable),
      entitySummaryTable: safeArr(s.comparison?.entitySummaryTable).map(e => ({
        docIndex: safeNum(e.docIndex,1), documentId: safeStr(e.documentId), date: safeStr(e.date),
        overallVerdict: safeStr(e.overallVerdict), completenessScore: safeNum(e.completenessScore),
        failCount: safeNum(e.failCount), warnCount: safeNum(e.warnCount), criticalCount: safeNum(e.criticalCount),
      })),
      fieldComparison: safeArr(s.comparison?.fieldComparison).map(fc => ({
        fieldName: safeStr(fc.fieldName), specification: safeStr(fc.specification),
        specConsistent: safeBool(fc.specConsistent,true),
        results: safeArr(fc.results).map(r => ({ docIndex: safeNum(r.docIndex,1), documentId: safeStr(r.documentId), value: safeStr(r.value), passOrFail: safeEnum(r.passOrFail,vPF,"N/A") })),
        trend: safeEnum(fc.trend,vTrend,"N/A"), varianceFlag: safeBool(fc.varianceFlag),
      })),
      crossDocumentInsights: safeArr(s.comparison?.crossDocumentInsights).map(String),
    },
    riskAnalysis: {
      overallRiskLevel: safeEnum(s.riskAnalysis?.overallRiskLevel,vSeverity,"LOW"),
      riskItems: safeArr(s.riskAnalysis?.riskItems).map(r => ({
        riskId: safeStr(r.riskId), severity: safeEnum(r.severity,vSeverity,"LOW"),
        category: safeEnum(r.category,vCategory,"Quality"), description: safeStr(r.description),
        affectedDocuments: safeArr(r.affectedDocuments).map(Number),
        affectedFields: safeArr(r.affectedFields).map(String),
        sourceLocation: safeStr(r.sourceLocation), recommendation: safeStr(r.recommendation),
        sourceUrl: r.sourceUrl != null ? safeStr(r.sourceUrl) : null,
      })),
    },
    sourceCitations: safeArr(s.sourceCitations).map(c => ({
      citationId: safeStr(c.citationId), dataPoint: safeStr(c.dataPoint),
      docIndex: safeNum(c.docIndex,1), pageNumber: safeStr(c.pageNumber),
      sectionName: safeStr(c.sectionName), rowOrPosition: safeStr(c.rowOrPosition),
      extractedValue: safeStr(c.extractedValue),
      sourceUrl: c.sourceUrl != null ? safeStr(c.sourceUrl) : null,
    })),
    keyRegulatoryReferences: safeArr(s.keyRegulatoryReferences).map(r => ({
      name: safeStr(r.name), relevance: safeStr(r.relevance),
      url: r.url != null ? safeStr(r.url) : null,
    })),
    smartSummary: {
      objective: safeStr(s.smartSummary?.objective), scope: safeStr(s.smartSummary?.scope),
      keyFindings: safeArr(s.smartSummary?.keyFindings).map(String),
      riskSummary: safeStr(s.smartSummary?.riskSummary),
      actionItems: safeArr(s.smartSummary?.actionItems).map(String),
      overallConclusion: safeStr(s.smartSummary?.overallConclusion),
      plainEnglishSummary: safeStr(s.smartSummary?.plainEnglishSummary),
      technicalGlossary: safeArr(s.smartSummary?.technicalGlossary).map(g => ({ term: safeStr(g.term), simpleExplanation: safeStr(g.simpleExplanation) })),
    },
    classificationAndPriority: {
      category:          safeEnum(s.classificationAndPriority?.category,vCatCl,"Routine Quality Check"),
      priorityLevel:     safeEnum(s.classificationAndPriority?.priorityLevel,vPriority,"Low"),
      priorityReason:    safeStr(s.classificationAndPriority?.priorityReason),
      recommendedAction: safeEnum(s.classificationAndPriority?.recommendedAction,vAction,"Approve"),
    },
    plainEnglishSummary: safeStr(s.smartSummary?.plainEnglishSummary || s.plainEnglishSummary),
    documentRisk: ({CRITICAL:"HIGH",HIGH:"HIGH",MEDIUM:"MEDIUM",LOW:"LOW"})[s.riskAnalysis?.overallRiskLevel] || "LOW",
    unusualObservations: {
      hasUnusualValues: safeBool(s.unusualObservations?.hasUnusualValues),
      observations: safeArr(s.unusualObservations?.observations).map(String),
      missingFields: safeArr(s.unusualObservations?.missingFields).map(String),
    },

    // ── STABILITY REPORT fields ──────────────────────────────────────────────
    masterBatchList: safeArr(s.masterBatchList).map(b => ({
      batchNumber:          safeStr(b.batchNumber) || "UNKNOWN",
      manufacturer:         safeStr(b.manufacturer),
      dateOfManufacture:    b.dateOfManufacture != null ? safeStr(b.dateOfManufacture) : null,
      beginningOfStability: b.beginningOfStability != null ? safeStr(b.beginningOfStability) : null,
      batchSizeKg:          b.batchSizeKg != null ? safeNum(b.batchSizeKg) : null,
      batchType:            safeEnum(b.batchType, ["PILOT","PRODUCTION","CLINICAL","OTHER"], "PRODUCTION"),
      overallStatus:        safeEnum(b.overallStatus, ["PASS","FAIL","PASS_WITH_OBSERVATIONS","PARTIAL"], "PASS"),
      conditionsTested:     safeArr(b.conditionsTested).map(String),
      maxTimepoint:         b.maxTimepoint != null ? safeNum(b.maxTimepoint) : null,
    })),

    stabilityMatrix: safeArr(s.stabilityMatrix).filter(sm => sm && (sm.batchNumber || sm.condition)).map(sm => {
      // Derive timepointsAvailable from actual timepoints keys in results
      const allTpKeys = [...new Set(
        safeArr(sm.results).flatMap(r => {
          const tp = r.timepoints;
          if (!tp || typeof tp !== "object") return [];
          // Handle nested timepoints (e.g. {0: {impurityA: val, ...}})
          return Object.keys(tp);
        })
      )].map(k => Number(k)).filter(n => !isNaN(n)).sort((a,b) => a-b);

      const derivedTp = allTpKeys.length > 0 ? allTpKeys
        : safeArr(sm.timepointsAvailable).map(Number).filter(n => !isNaN(n));

      return {
        batchNumber:         safeStr(sm.batchNumber) || safeStr(sm.condition) || "UNKNOWN",
        condition:           safeStr(sm.condition),
        conditionType:       safeEnum(sm.conditionType, ["LONG_TERM","ACCELERATED","INTERMEDIATE","REFRIGERATED","OTHER"], "LONG_TERM"),
        timepointsAvailable: derivedTp,
        overallStatus:       safeEnum(sm.overallStatus, ["PASS","FAIL","PASS_WITH_OBSERVATIONS","PARTIAL"], "PASS"),
        results: safeArr(sm.results).map(r => {
          const tp = (r.timepoints && typeof r.timepoints === "object") ? r.timepoints : {};
          // Flatten nested timepoints (e.g. {0: {impurityA, total}} -> store as-is, frontend handles)
          return {
            testName:      safeStr(r.testName),
            specification: r.specification != null ? safeStr(r.specification) : null,
            unit:          r.unit != null ? safeStr(r.unit) : null,
            timepoints:    tp,
            trend:         safeEnum(r.trend, ["STABLE","IMPROVING","DEGRADING","VARIABLE"], "STABLE"),
            lowestValue:   r.lowestValue != null ? r.lowestValue : null,
            highestValue:  r.highestValue != null ? r.highestValue : null,
            worstPctOfLimit: r.worstPctOfLimit != null ? r.worstPctOfLimit : null,
            allPass:       safeBool(r.allPass, true),
            outOfTrend:    safeBool(r.outOfTrend, false),
            alertLevel:    safeEnum(r.alertLevel, ["NONE","LOW","MEDIUM","HIGH","CRITICAL"], "NONE"),
          };
        }),
      };
    }),

    studyProtocol: {
      conditions: safeArr(s.studyProtocol?.conditions).map(c => ({
        condition:  safeStr(c.condition),
        type:       safeEnum(c.type, ["ACCELERATED","LONG_TERM","INTERMEDIATE","OTHER"], "LONG_TERM"),
        timepoints: safeArr(c.timepoints).map(Number),
      })),
      testParameters: safeArr(s.studyProtocol?.testParameters).map(t => ({
        testName:           safeStr(t.testName),
        acceptanceCriteria: safeStr(t.acceptanceCriteria),
        analyticalMethod:   safeStr(t.analyticalMethod),
      })),
    },

    branchList:    safeArr(s.branchList),
    companySummary: s.companySummary || null,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// UPLOAD & ANALYSE
// ════════════════════════════════════════════════════════════════════════════════
exports.uploadDocument = async (req, res) => {
  try {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];
    if (!files.length) return res.status(400).json({ error:"No file(s) uploaded" });
    const userId = req.user?._id ?? req.body.userId;
    if (!userId) return res.status(401).json({ error:"Unauthorised" });
    const customPrompt = req.body.prompt || null;
    const savedDocs = [];

    for (const file of files) {
      try {
        const fileType   = detectFileType(file.originalname, file.mimetype);
        const dbFileType = toDbFileType(fileType);

        // Upload to Azure Blob
        let blobUrl = null, blobFileName = null;
        try {
          const blob = await uploadToAzureBlob(file);
          blobUrl = blob.url; blobFileName = blob.uniqueFileName;
         } catch (e) { console.warn("Blob failed:", e.message); }

        // Extract raw text (handles digital + scanned)
         const { rawText, pageCount, method } = await extractText(file.buffer, fileType, openaiClient);
 
        // Analyse: send raw TEXT to GPT-4o
        const gptResponse    = await analyzeDocument({ rawText, pageCount, fileType, originalName: file.originalname, customPrompt });
        const analysisResult = mapToAnalysisResult(gptResponse.structured);
 
        const doc = await Document.create({
          userId, originalName: file.originalname, fileType: dbFileType,
          fileSize: file.size,
          extractedText: rawText.slice(0, 50000),  // store first 50k chars
          wordCount: rawText.split(/\s+/).filter(Boolean).length,
          pageCount: gptResponse.structured?.totalPages ?? pageCount,
          status: "analyzed", customPrompt, blobUrl, blobFileName, analysisResult,
          gptResponse: { rawMessage: gptResponse.rawMessage, structured: gptResponse.structured, model: gptResponse.model, tokens: gptResponse.tokens, finishReason: gptResponse.finishReason },
        });

        savedDocs.push({
          _id: doc._id, originalName: doc.originalName, fileType: doc.fileType,
          fileSize: doc.fileSize, wordCount: doc.wordCount, pageCount: doc.pageCount,
          status: doc.status, uploadedAt: doc.createdAt, blobUrl: doc.blobUrl,
          analysisResult: doc.analysisResult,
          gptResponse: { tokens: gptResponse.tokens, model: gptResponse.model, finishReason: gptResponse.finishReason },
        });

      } catch (fileErr) {
         savedDocs.push({ originalName: file.originalname, error: fileErr.message, status:"failed" });
      }
    }

    const ok = savedDocs.filter(d => !d.error).length;
    const fail = savedDocs.filter(d => d.error).length;
    return res.status(201).json({
      success: ok > 0,
      message: `${ok} file(s) analysed${fail ? `, ${fail} failed` : ""}`,
      count: savedDocs.length,
      documents: files.length === 1 ? savedDocs[0] : savedDocs,
    });
  } catch (err) {
     return res.status(500).json({ success:false, error: err.message || "Upload failed" });
  }
};

exports.analyzeText = async (req, res) => {
  try {
    const userId = req.user?._id ?? req.body.userId;
    if (!userId) return res.status(401).json({ error:"Unauthorised" });
    const { text, documentName, prompt } = req.body;
    if (!text || text.trim().length < 10) return res.status(400).json({ error:"Text too short" });
    const originalName = (documentName || "Raw Text Input").trim();
    const gptResponse  = await analyzeDocument({ rawText:text, pageCount:1, fileType:"txt", originalName, customPrompt: prompt||null });
    const analysisResult = mapToAnalysisResult(gptResponse.structured);
    const doc = await Document.create({ userId, originalName, fileType:"txt", fileSize: Buffer.byteLength(text,"utf8"), extractedText:text, wordCount: text.split(/\s+/).filter(Boolean).length, pageCount:1, status:"analyzed", customPrompt: prompt||null, analysisResult, gptResponse:{ rawMessage: gptResponse.rawMessage, structured: gptResponse.structured, model: gptResponse.model, tokens: gptResponse.tokens, finishReason: gptResponse.finishReason } });
    return res.status(201).json({ success:true, message:"Text analysed", document:{ _id:doc._id, originalName:doc.originalName, status:doc.status, uploadedAt:doc.createdAt, analysisResult:doc.analysisResult } });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

exports.submitForApproval = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success:false, error:"Not found" });
    if (doc.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, error:"Forbidden" });
    if (!["analyzed","changes_requested"].includes(doc.status)) return res.status(409).json({ success:false, error:`Cannot submit — status is "${doc.status}"` });
    doc.status="pending_review"; doc.submittedAt=new Date(); doc.reviewNote=null;
    await doc.save();
    const staff = await User.find({ role:{ $in:["reviewer","admin"] } }, "_id");
    const name  = req.user.name || req.user.email || "An analyst";
    staff.forEach(u => sendNotification(u._id, { type:"DOCUMENT_SUBMITTED", documentName:doc.originalName, message:`${name} submitted "${doc.originalName}" for review.` }));
    return res.status(200).json({ success:true, message:"Submitted", document:{ _id:doc._id, status:doc.status, submittedAt:doc.submittedAt } });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

exports.reviewDocument = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["approve","reject","request_changes"].includes(action)) return res.status(400).json({ success:false, error:"Invalid action" });
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success:false, error:"Not found" });
    if (doc.status !== "pending_review") return res.status(409).json({ success:false, error:`Status is "${doc.status}"` });
    doc.status = { approve:"approved", reject:"rejected", request_changes:"changes_requested" }[action];
    doc.reviewedAt=new Date(); doc.reviewedBy=req.user._id; doc.reviewNote=note||null;
    await doc.save();
    sendNotification(doc.userId, { type:"DOCUMENT_REVIEWED", documentName:doc.originalName, status:doc.status, message:`Your document "${doc.originalName}" has been ${doc.status}.` });
    return res.status(200).json({ success:true, message:`Document ${action}d`, document:{ _id:doc._id, status:doc.status, reviewedAt:doc.reviewedAt } });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

exports.getDocuments = async (req, res) => {
  try {
    const { role, _id:uid } = req.user;
    let mf = {};
    if (role === "analyst") {
      // Analyst sees only their own documents
      mf = { userId: new Types.ObjectId(uid) };
    } else if (role === "admin") {
      // Admin sees ALL documents from all users
      mf = {};
    } else if (role === "reviewer") {
      mf = { status: { $in: ["pending_review", "approved", "rejected", "deleted", "changes_requested"] } };
    } else {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const docs = await Document.aggregate([
      { $match:mf },
      { $lookup:{ from:"users", localField:"userId",     foreignField:"_id", as:"userId"     } },
      { $lookup:{ from:"users", localField:"reviewedBy", foreignField:"_id", as:"reviewedBy" } },
      { $unwind:{ path:"$userId",     preserveNullAndEmptyArrays:true } },
      { $unwind:{ path:"$reviewedBy", preserveNullAndEmptyArrays:true } },
      { $project:{ _id:1, originalName:1, fileType:1, fileSize:1, wordCount:1, pageCount:1, status:1, submittedAt:1, reviewedAt:1, reviewNote:1, blobFileName:1, createdAt:1, userId:{_id:1,name:1,email:1,role:1}, reviewedBy:{_id:1,name:1,email:1,role:1}, "analysisResult.documentSetType":1, "analysisResult.documentCount":1, "analysisResult.documentType":1, "analysisResult.completenessScore":1, "analysisResult.totalPages":1, "analysisResult.documentOverview":1, "analysisResult.riskAnalysis.overallRiskLevel":1, "analysisResult.classificationAndPriority":1, "analysisResult.smartSummary.overallConclusion":1, "analysisResult.smartSummary.plainEnglishSummary":1, "analysisResult.smartSummary.keyFindings":1, "analysisResult.unusualObservations":1 } },
      { $sort:{ createdAt:-1 } },
    ]);
    const result = docs.map(({ blobFileName, ...rest }) => ({ ...rest, fileUrl: blobFileName ? generateSasUrl(blobFileName) : null }));
    return res.status(200).json({ success:true, count:result.length, data:result });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

exports.getDocumentById = async (req, res) => {
  try {
    const docs = await Document.aggregate([
      { $match:{ _id:new Types.ObjectId(req.params.id) } },
      { $lookup:{ from:"users", localField:"userId",     foreignField:"_id", as:"userId"     } },
      { $lookup:{ from:"users", localField:"reviewedBy", foreignField:"_id", as:"reviewedBy" } },
      { $unwind:{ path:"$userId",     preserveNullAndEmptyArrays:true } },
      { $unwind:{ path:"$reviewedBy", preserveNullAndEmptyArrays:true } },
      { $project:{ _id:1, originalName:1, fileType:1, fileSize:1, wordCount:1, pageCount:1, status:1, submittedAt:1, reviewedAt:1, reviewNote:1, blobFileName:1, createdAt:1, userId:{_id:1,name:1,email:1,role:1}, reviewedBy:{_id:1,name:1,email:1,role:1}, analysisResult:1, gptResponse:1 } },
    ]);
    if (!docs.length) return res.status(404).json({ success:false, error:"Not found" });
    const { blobFileName, ...rest } = docs[0];
    return res.status(200).json({ success:true, data:{ ...rest, fileUrl: blobFileName ? generateSasUrl(blobFileName) : null } });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success:false, error:"Not found" });
    if (doc.blobFileName) { try { await deleteFromAzureBlob(doc.blobFileName); } catch(e) { console.warn("Blob delete:", e.message); } }
    doc.status="deleted"; doc.deletedAt=new Date();
    await doc.save();
    const staff = await User.find({ role:{ $in:["reviewer","admin"] } }, "_id");
    const name  = req.user.name || req.user.email || "An analyst";
    staff.forEach(u => sendNotification(u._id, { type:"DOCUMENT_DELETED", documentName:doc.originalName, message:`${name} deleted "${doc.originalName}".` }));
    return res.status(200).json({ success:true, message:"Deleted", status:doc.status });
  } catch (err) { return res.status(500).json({ success:false, error:err.message }); }
};
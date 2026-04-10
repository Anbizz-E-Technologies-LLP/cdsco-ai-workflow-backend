// const pdfParse = require("pdf-parse");
// const Document = require("../model/documentModel");
// const path = require("path");
// const OpenAI = require("openai");

// const openaiClient = new OpenAI({
//   apiKey: process.env.AZURE_OPENAI_KEY,
//   baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
//   defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
//   defaultHeaders: { "api-key": process.env.AZURE_OPENAI_KEY },
// });

// const PREDEFINED_PROMPT = `You are an expert document reader and plain-English explainer.

// A user has uploaded a document. Your job is to read it completely and explain EVERYTHING in simple, everyday language as if the reader has never seen this type of document before.

// Respond ONLY with a valid JSON object — no markdown, no backticks, no text outside the JSON.

// Return exactly this structure:
// {
//   "documentOverview": {
//     "documentType": "<What type of document is this — e.g. Certificate of Analysis, Invoice, Medical Report, Legal Agreement, etc.>",
//     "madeBy": "<Who created or issued this document>",
//     "madeFor": "<Who this document is addressed to or intended for>",
//     "purpose": "<In one simple sentence — why does this document exist and what is it used for>"
//   },
//   "fieldByFieldExplanation": [
//     {
//       "fieldName": "<Exact field name or label as it appears in the document>",
//       "value": "<Exact value as it appears in the document>",
//       "plainEnglishMeaning": "<What this field name means in everyday words>",
//       "plainEnglishValue": "<What this specific value tells us in plain English>"
//     }
//   ],
//   "technicalTermsExplained": [
//     {
//       "term": "<Technical, scientific, legal or jargon word found in the document>",
//       "simpleExplanation": "<One sentence explanation using everyday language or a comparison>"
//     }
//   ],
//   "unusualObservations": {
//     "hasUnusualValues": <true | false>,
//     "observations": [
//       "<Each item describes one thing that looks unusual, missing, inconsistent, or concerning — use [] if everything looks normal>"
//     ],
//     "missingFields": [
//       "<Fields or information you would normally expect in this type of document but are absent — use [] if nothing is missing>"
//     ]
//   },
//   "plainEnglishSummary": "<4 to 5 sentences summarising the entire document in simple language that anyone with no technical background can understand>",
//   "documentType": "<Repeat the document type here — e.g. COA | Invoice | Medical Report | Legal Contract | Other>",
//   "completenessScore": <integer 0-100>
// }

// CRITICAL RULES:
// - Your ENTIRE response must be ONE valid JSON object. Nothing before it, nothing after it.
// - Do NOT add trailing commas after the last item in any array or object.
// - Do NOT add any text, explanation, or comments outside the JSON.
// - fieldByFieldExplanation: Go row by row, field by field. Never skip anything.
// - technicalTermsExplained: Include every word a non-expert would not understand.
// - Never return null for arrays — use [] instead.
// - Respond ONLY with the JSON.`;

// // ─── File type helpers ─────────────────────────────────────────────────────────
// const getFileType = (filename) => {
//   const ext = path.extname(filename).toLowerCase();
//   if (ext === ".pdf") return "pdf";
//   if (ext === ".txt") return "txt";
//   if (ext === ".docx") return "docx";
//   if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
//   return "other";
// };

// const getImageMediaType = (filename) => {
//   const map = {
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".png": "image/png",
//     ".webp": "image/webp",
//     ".gif": "image/gif",
//   };
//   return map[path.extname(filename).toLowerCase()] || "image/jpeg";
// };


// function extractJSON(raw) {
//   let text = raw
//     .replace(/^```json\s*/i, "")
//     .replace(/^```\s*/i, "")
//     .replace(/```\s*$/i, "")
//     .trim();

//   text = text.replace(/,\s*([}\]])/g, "$1");

//   try {
//     return JSON.parse(text);
//   } catch (_) {}

//   const firstBrace = text.indexOf("{");
//   const lastBrace = text.lastIndexOf("}");
//   if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
//     const slice = text.slice(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, "$1");
//     try {
//       return JSON.parse(slice);
//     } catch (_) {}
//   }

//   return null; 
// }

// async function analyzeWithGPT4o(fileType, extractedText, fileBuffer, originalName, customPrompt = null) {
//   const systemPrompt = customPrompt || PREDEFINED_PROMPT;
//   let messages = [{ role: "system", content: systemPrompt }];

//   if (fileType === "image") {
//     const base64Image = fileBuffer.toString("base64");
//     const mediaType = getImageMediaType(originalName);
//     messages.push({
//       role: "user",
//       content: [
//         {
//           type: "text",
//           text: `Analyze this document: "${originalName}". Read every detail and return ONLY a valid JSON object — no text before or after.`,
//         },
//         {
//           type: "image_url",
//           image_url: { url: `data:${mediaType};base64,${base64Image}`, detail: "high" },
//         },
//       ],
//     });
//   } else {
//     const truncatedText = extractedText.slice(0, 12000);
//     messages.push({
//       role: "user",
//       content: `Document filename: "${originalName}"\n\nDocument content:\n${truncatedText}\n\nRead every field and value carefully. Return ONLY a valid JSON object — no text before or after.`,
//     });
//   }

//   const response = await openaiClient.chat.completions.create({
//     model: process.env.AZURE_OPENAI_DEPLOYMENT,
//     messages,
//     max_tokens: 3500,
//     temperature: 0.1,
//   });

//   const rawMessage = response.choices[0]?.message?.content?.trim() || "";
//   const structured = extractJSON(rawMessage);

//   if (structured) {
//     console.log("✅ GPT-4o JSON parsed successfully.");
//   } else {
//     console.error("⚠️ GPT-4o returned non-parseable JSON. Raw snippet:", rawMessage.slice(0, 300));
//   }

//   const safe = structured || {
//     documentOverview: {
//       documentType: "Unknown",
//       madeBy: "Could not determine",
//       madeFor: "Could not determine",
//       purpose: "Analysis could not be parsed from the GPT response.",
//     },
//     fieldByFieldExplanation: [],
//     technicalTermsExplained: [],
//     unusualObservations: {
//       hasUnusualValues: false,
//       observations: ["GPT response could not be parsed as valid JSON."],
//       missingFields: [],
//     },
//     plainEnglishSummary: rawMessage.slice(0, 500) || "Analysis could not be parsed.",
//     documentType: "Unknown",
//     completenessScore: 0,
//   };

//   return {
//     rawMessage,
//     structured: safe,
//     model: response.model || process.env.AZURE_OPENAI_DEPLOYMENT,
//     tokens: {
//       prompt: response.usage?.prompt_tokens || 0,
//       completion: response.usage?.completion_tokens || 0,
//       total: response.usage?.total_tokens || 0,
//     },
//     finishReason: response.choices[0]?.finish_reason || "unknown",
//   };
// }

//  exports.uploadDocument = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//     const fileType = getFileType(req.file.originalname);
//     let extractedText = "";
//     let pageCount = 1;

//     if (fileType === "pdf") {
//       const parsed = await pdfParse(req.file.buffer);
//       extractedText = parsed.text || "";
//       pageCount = parsed.numpages || 1;

//       if (!extractedText || extractedText.trim().length < 20) {
//         console.log("⚠️ No text found in PDF — GPT-4o Vision will handle it.");
//         extractedText = "[Scanned PDF — content extracted via GPT-4o Vision]";
//       }
//     } else if (fileType === "txt") {
//       extractedText = req.file.buffer.toString("utf8");
//     } else if (fileType === "image") {
//       extractedText = "[Image — content extracted via GPT-4o Vision]";
//     }

//     const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
//     const customPrompt = req.body.prompt || null;

//     console.log(`🤖 Analyzing "${req.file.originalname}" (${fileType}) with GPT-4o...`);

//     const gptResponse = await analyzeWithGPT4o(
//       fileType, extractedText, req.file.buffer, req.file.originalname, customPrompt
//     );

//     const s = gptResponse.structured;

//      const doc = await Document.create({
//       originalName: req.file.originalname,
//       fileType: fileType === "image" ? "other" : fileType,
//       fileSize: req.file.size,
//       extractedText,
//       wordCount,
//       pageCount,
//       status: "processed",
//       customPrompt,
//       gptResponse: {
//         rawMessage:  gptResponse.rawMessage,
//         structured:  s,
//         model:       gptResponse.model,
//         tokens:      gptResponse.tokens,
//         finishReason: gptResponse.finishReason,
//       },
//       analysisResult: {
//         documentType:        s.documentType,
//         completenessScore:   s.completenessScore,
//         plainEnglishSummary: s.plainEnglishSummary,
//         documentOverview:    s.documentOverview,
//         fieldByFieldExplanation:  s.fieldByFieldExplanation  || [],
//         technicalTermsExplained:  s.technicalTermsExplained  || [],
//         unusualObservations:      s.unusualObservations || {
//           hasUnusualValues: false,
//           observations: [],
//           missingFields: [],
//         },
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "File uploaded and analyzed successfully",
//       document: {
//         _id:          doc._id,
//         originalName: doc.originalName,
//         fileType:     doc.fileType,
//         fileSize:     doc.fileSize,
//         wordCount:    doc.wordCount,
//         pageCount:    doc.pageCount,
//         status:       doc.status,
//         uploadedAt:   doc.createdAt,

//         analysisResult: doc.analysisResult, 

//         gptResponse: {
//           tokens:      gptResponse.tokens,
//           model:       gptResponse.model,
//           finishReason: gptResponse.finishReason,
//         },
//       },
//     });
//   } catch (err) {
//     console.error("Upload error:", err);
//     res.status(500).json({ success: false, error: err.message || "Upload failed" });
//   }
// };

const pdfParse = require("pdf-parse");
const Document = require("../model/documentModel");
const { analyzeDocument } = require("../services/aiService");
const { getFileType } = require("../utils/Filehelpers");


exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

const userId = req.user?._id ?? req.body.userId
    if (!userId) {
      return res.status(401).json({ error: "Unauthorised — userId missing" });
    }

    const fileType = getFileType(req.file.originalname);
    let extractedText = "";
    let pageCount = 1;

    if (fileType === "pdf") {
      const parsed = await pdfParse(req.file.buffer);
      extractedText = parsed.text || "";
      pageCount = parsed.numpages || 1;

      if (!extractedText || extractedText.trim().length < 20) {
        console.log("⚠️ No text found in PDF — GPT-4o Vision will handle it.");
        extractedText = "[Scanned PDF — content extracted via GPT-4o Vision]";
      }
    } else if (fileType === "txt") {
      extractedText = req.file.buffer.toString("utf8");
    } else if (fileType === "image") {
      extractedText = "[Image — content extracted via GPT-4o Vision]";
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const customPrompt = req.body.prompt || null;

    console.log(`🤖 Analyzing "${req.file.originalname}" (${fileType}) with GPT-4o...`);

    const gptResponse = await analyzeDocument({
      fileType,
      extractedText,
      fileBuffer: req.file.buffer,
      originalName: req.file.originalname,
      customPrompt,
    });

    const s = gptResponse.structured;

    const doc = await Document.create({
      userId,
      originalName: req.file.originalname,
      fileType: fileType === "image" ? "other" : fileType,
      fileSize: req.file.size,
      extractedText,
      wordCount,
      pageCount,
      status: "analyzed",
      customPrompt,
      gptResponse: {
        rawMessage: gptResponse.rawMessage,
        structured: s,
        model: gptResponse.model,
        tokens: gptResponse.tokens,
        finishReason: gptResponse.finishReason,
      },
      analysisResult: {
        documentType: s.documentType,
        completenessScore: s.completenessScore,
        plainEnglishSummary: s.plainEnglishSummary,
        documentOverview: s.documentOverview,
        fieldByFieldExplanation: s.fieldByFieldExplanation || [],
        technicalTermsExplained: s.technicalTermsExplained || [],
        unusualObservations: s.unusualObservations || {
          hasUnusualValues: false,
          observations: [],
          missingFields: [],
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded and analyzed successfully",
      document: {
        _id: doc._id,
        userId: doc.userId,
        originalName: doc.originalName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        wordCount: doc.wordCount,
        pageCount: doc.pageCount,
        status: doc.status,
        uploadedAt: doc.createdAt,
        analysisResult: doc.analysisResult,
        gptResponse: {
          tokens: gptResponse.tokens,
          model: gptResponse.model,
          finishReason: gptResponse.finishReason,
        },
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ success: false, error: err.message || "Upload failed" });
  }
};


exports.submitForApproval = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Forbidden — not your document" });
    }

    const allowedStatuses = ["analyzed", "changes_requested"];
    if (!allowedStatuses.includes(doc.status)) {
      return res.status(409).json({
        success: false,
        error: `Cannot submit — document is currently "${doc.status}"`,
      });
    }

    doc.status = "pending_review";
    doc.submittedAt = new Date();
    doc.reviewNote = null;
    await doc.save();

    return res.status(200).json({
      success: true,
      message: "Document submitted for approval",
      document: {
        _id: doc._id,
        status: doc.status,
        submittedAt: doc.submittedAt,
      },
    });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({ success: false, error: err.message || "Submission failed" });
  }
};

exports.reviewDocument = async (req, res) => {
  try {
    const { action, note } = req.body;

    const validActions = ["approve", "reject", "request_changes"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Allowed: ${validActions.join(", ")}`,
      });
    }

    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    if (doc.status !== "pending_review") {
      return res.status(409).json({
        success: false,
        error: `Cannot review — document is currently "${doc.status}"`,
      });
    }

    const actionStatusMap = {
      approve: "approved",
      reject: "rejected",
      request_changes: "changes_requested",
    };

    doc.status = actionStatusMap[action];
    doc.reviewedAt = new Date();
    doc.reviewedBy = req.user._id;
    doc.reviewNote = note || null;
    await doc.save();

    return res.status(200).json({
      success: true,
      message: `Document ${action.replace("_", " ")}d successfully`,
      document: {
        _id: doc._id,
        status: doc.status,
        reviewedAt: doc.reviewedAt,
        reviewedBy: doc.reviewedBy,
      },
    });
  } catch (err) {
    console.error("Review error:", err);
    return res.status(500).json({ success: false, error: err.message || "Review failed" });
  }
};
// exports.getDocuments = async (req, res) => {
//   try {
//     const allowedRoles = ["analyst", "reviewer"];
//     if (!allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({
//         success: false,
//         error: "Forbidden — only analysts and reviewers can access",
//       });
//     }

//     const filter = { status: "pending_review" };

//     const docs = await Document.find(filter)
//       .select(
//         "_id userId originalName fileType fileSize wordCount pageCount status submittedAt reviewedAt reviewedBy reviewNote createdAt updatedAt"
//       )
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       count: docs.length,
//       data: docs,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };

exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: "Document not found" });
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { role, _id: loggedInUserId } = req.user

    let filter = {}

    if (role === 'analyst') {
      // analyst sees only their own documents
      // userId from query param as fallback, but always trust req.user._id
      filter = { userId: loggedInUserId }

    } else if (role === 'reviewer') {
      // reviewer sees all pending_review documents
      filter = { status: 'pending_review' }

    } else if (role === 'admin') {
      // admin sees everything — no filter
      filter = { status: 'pending_review' }

    } else {
      return res.status(403).json({
        success: false,
        error: 'Forbidden — insufficient role',
      })
    }

    const docs = await Document.find(filter)
      .select(
        '_id userId originalName fileType fileSize wordCount pageCount status isSubmitted submittedAt reviewedAt reviewedBy reviewNote analysisResult createdAt updatedAt'
      )
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: docs.length,
      data: docs,
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
};
 
// exports.getDocumentById = async (req, res) => {
//   try {
//     const doc = await Document.findById(req.params.id).populate(
//       "reviewedBy",
//       "name email"
//     );
 
//     if (!doc) {
//       return res.status(404).json({ success: false, error: "Document not found" });
//     }
 
//     if (doc.userId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ success: false, error: "Forbidden — not your document" });
//     }
 
//     return res.status(200).json({
//       success: true,
//       data: {
//         _id:          doc._id,
//         userId:       doc.userId,
//         originalName: doc.originalName,
//         fileType:     doc.fileType,
//         fileSize:     doc.fileSize,
//         wordCount:    doc.wordCount,
//         pageCount:    doc.pageCount,
//         status:       doc.status,
//         submittedAt:  doc.submittedAt,
//         reviewedAt:   doc.reviewedAt,
//         reviewedBy:   doc.reviewedBy,
//          customPrompt: doc.customPrompt,
//         analysisResult: doc.analysisResult,
//         gptResponse: {
//           model:        doc.gptResponse?.model,
//           tokens:       doc.gptResponse?.tokens,
//           finishReason: doc.gptResponse?.finishReason,
//         },
//         uploadedAt: doc.createdAt,
//         updatedAt:  doc.updatedAt,
//       },
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
    if (!doc) return res.status(404).json({ success: false, error: "Document not found" })

    doc.status = 'deleted'
    doc.deletedAt = new Date()
    await doc.save()

    res.status(200).json({ success: true, message: "Document deleted successfully", status: doc.status })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}
// const pdfParse = require("pdf-parse");
// const Document = require("../model/documentModel");
// const path = require("path");
// const OpenAI = require("openai");

// // ─── Azure OpenAI Client ───────────────────────────────────────────────────────
// const openaiClient = new OpenAI({
//   apiKey: process.env.AZURE_OPENAI_KEY,
//   baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
//   defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
//   defaultHeaders: { "api-key": process.env.AZURE_OPENAI_KEY },
// });

// // ─── PREDEFINED PROMPT — Plain English Document Explainer ─────────────────────
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
//       "<Each item describes one thing that looks unusual, missing, inconsistent, or concerning — or leave as [] if everything looks normal>"
//     ],
//     "missingFields": [
//       "<Fields or information you would normally expect in this type of document but are absent>"
//     ]
//   },

//   "plainEnglishSummary": "<4 to 5 sentences summarising the entire document in simple language that anyone with no technical background can understand. Include what the document is, what it says, whether values are normal, and any key takeaway.>",

//   "documentType": "<Repeat the document type here for easy access — e.g. COA | Invoice | Medical Report | Legal Contract | Other>",
//   "completenessScore": <integer 0-100 — 100 means all expected fields are present and filled, 0 means empty or unreadable>
// }

// Rules:
// - fieldByFieldExplanation: Go row by row, field by field. Do NOT skip anything — dates, batch numbers, reference numbers, signatures, stamps, units, tolerances — everything must be included.
// - technicalTermsExplained: Include every word a non-expert would not understand.
// - unusualObservations: Be honest. If a value is out of range, a field is blank, a date is in the past, or something does not match — flag it clearly.
// - plainEnglishSummary: Write as if explaining to a person with zero technical background.
// - Never return null for arrays — use [] instead.
// - Respond ONLY with the JSON. No text before or after.`;

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

// // ─── GPT-4o Analysis ──────────────────────────────────────────────────────────
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
//           text: `Analyze this document: "${originalName}". Read every detail and return only valid JSON as instructed.`,
//         },
//         {
//           type: "image_url",
//           image_url: {
//             url: `data:${mediaType};base64,${base64Image}`,
//             detail: "high",
//           },
//         },
//       ],
//     });
//   } else {
//     const truncatedText = extractedText.slice(0, 12000);
//     messages.push({
//       role: "user",
//       content: `Document filename: "${originalName}"\n\nDocument content:\n${truncatedText}\n\nRead every field and value carefully. Return only valid JSON as instructed.`,
//     });
//   }

//   const response = await openaiClient.chat.completions.create({
//     model: process.env.AZURE_OPENAI_DEPLOYMENT,
//     messages,
//     max_tokens: 3000,
//     temperature: 0.1,
//   });

//   const rawMessage = response.choices[0]?.message?.content?.trim() || "";

//   // ── Parse JSON — strip any accidental markdown fences ──
//   let structured = null;
//   try {
//     const clean = rawMessage
//       .replace(/^```json\s*/i, "")
//       .replace(/```\s*$/i, "")
//       .trim();
//     structured = JSON.parse(clean);
//   } catch (err) {
//     console.error("⚠️ GPT-4o returned non-JSON:", rawMessage.slice(0, 200));

//     // Fallback — safe default so frontend never breaks
//     structured = {
//       documentOverview: {
//         documentType: "Unknown",
//         madeBy: "Could not determine",
//         madeFor: "Could not determine",
//         purpose: "Analysis could not be parsed from the response.",
//       },
//       fieldByFieldExplanation: [],
//       technicalTermsExplained: [],
//       unusualObservations: {
//         hasUnusualValues: false,
//         observations: ["GPT response was not valid JSON — see rawMessage for details."],
//         missingFields: [],
//       },
//       plainEnglishSummary: rawMessage.slice(0, 500) || "Analysis could not be parsed.",
//       documentType: "Unknown",
//       completenessScore: 0,
//     };
//   }

//   return {
//     rawMessage,
//     structured,
//     model: response.model || process.env.AZURE_OPENAI_DEPLOYMENT,
//     tokens: {
//       prompt: response.usage?.prompt_tokens || 0,
//       completion: response.usage?.completion_tokens || 0,
//       total: response.usage?.total_tokens || 0,
//     },
//     finishReason: response.choices[0]?.finish_reason || "unknown",
//   };
// }

// // ─── UPLOAD DOCUMENT ──────────────────────────────────────────────────────────
// exports.uploadDocument = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//     const fileType = getFileType(req.file.originalname);
//     let extractedText = "";
//     let pageCount = 1;

//     // ── Text extraction ──
//     if (fileType === "pdf") {
//       const parsed = await pdfParse(req.file.buffer);
//       extractedText = parsed.text || "";
//       pageCount = parsed.numpages || 1;

//       // If PDF has no extractable text (scanned PDF), pass it as image to GPT-4o Vision
//       if (!extractedText || extractedText.trim().length < 20) {
//         console.log("⚠️ No text found in PDF — will send as image to GPT-4o Vision.");
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
//       fileType,
//       extractedText,
//       req.file.buffer,
//       req.file.originalname,
//       customPrompt
//     );

//     const s = gptResponse.structured;

//     // ── Save to MongoDB ──
//     const doc = await Document.create({
//       originalName: req.file.originalname,
//       fileType: fileType === "image" ? "other" : fileType,
//       fileSize: req.file.size,
//       extractedText,
//       wordCount,
//       pageCount,
//       status: "processed",
//       gptResponse,
//       customPrompt,

//       // Flattened fields for easy querying
//       analysisResult: {
//         documentType: s.documentType,
//         completenessScore: s.completenessScore,
//         plainEnglishSummary: s.plainEnglishSummary,
//         documentOverview: s.documentOverview,
//         fieldByFieldExplanation: s.fieldByFieldExplanation,
//         technicalTermsExplained: s.technicalTermsExplained,
//         unusualObservations: s.unusualObservations,
//       },
//     });

//     // ── Response for frontend ──
//     res.status(201).json({
//       success: true,
//       message: "File uploaded and analyzed successfully",
//       document: {
//         _id: doc._id,
//         originalName: doc.originalName,
//         fileType: doc.fileType,
//         fileSize: doc.fileSize,
//         wordCount: doc.wordCount,
//         pageCount: doc.pageCount,
//         status: doc.status,
//         uploadedAt: doc.createdAt,
//         extractedText: doc.extractedText,

//         // ── Top-level easy access fields ──
//         documentType: s.documentType,
//         completenessScore: s.completenessScore,
//         plainEnglishSummary: s.plainEnglishSummary,

//         // ── Full structured analysis ──
//         analysisResult: {
//           documentOverview: s.documentOverview,
//           fieldByFieldExplanation: s.fieldByFieldExplanation,
//           technicalTermsExplained: s.technicalTermsExplained,
//           unusualObservations: s.unusualObservations,
//           plainEnglishSummary: s.plainEnglishSummary,
//           documentType: s.documentType,
//           completenessScore: s.completenessScore,
//         },

//         // ── Raw GPT metadata ──
//         gptResponse: {
//           structured: s,
//           rawMessage: gptResponse.rawMessage,
//           tokens: gptResponse.tokens,
//           model: gptResponse.model,
//           finishReason: gptResponse.finishReason,
//         },
//       },
//     });
//   } catch (err) {
//     console.error("Upload error:", err);
//     res.status(500).json({ success: false, error: err.message || "Upload failed" });
//   }
// };

// // ─── GET ALL DOCUMENTS ────────────────────────────────────────────────────────
// exports.getDocuments = async (req, res) => {
//   try {
//     const docs = await Document.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, count: docs.length, data: docs });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// // ─── GET DOCUMENT BY ID ───────────────────────────────────────────────────────
// exports.getDocumentById = async (req, res) => {
//   try {
//     const doc = await Document.findById(req.params.id);
//     if (!doc) return res.status(404).json({ success: false, error: "Document not found" });
//     res.status(200).json({ success: true, data: doc });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// // ─── DELETE DOCUMENT ─────────────────────────────────────────────────────────
// exports.deleteDocument = async (req, res) => {
//   try {
//     const doc = await Document.findByIdAndDelete(req.params.id);
//     if (!doc) return res.status(404).json({ success: false, error: "Document not found" });
//     res.status(200).json({ success: true, message: "Document deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

const pdfParse = require("pdf-parse");
const Document = require("../model/documentModel");
const path = require("path");
const OpenAI = require("openai");

// ─── Azure OpenAI Client ───────────────────────────────────────────────────────
const openaiClient = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: { "api-key": process.env.AZURE_OPENAI_KEY },
});

// ─── PREDEFINED PROMPT — Plain English Document Explainer ─────────────────────
const PREDEFINED_PROMPT = `You are an expert document reader and plain-English explainer.

A user has uploaded a document. Your job is to read it completely and explain EVERYTHING in simple, everyday language as if the reader has never seen this type of document before.

Respond ONLY with a valid JSON object — no markdown, no backticks, no text outside the JSON.

Return exactly this structure:
{
  "documentOverview": {
    "documentType": "<What type of document is this — e.g. Certificate of Analysis, Invoice, Medical Report, Legal Agreement, etc.>",
    "madeBy": "<Who created or issued this document>",
    "madeFor": "<Who this document is addressed to or intended for>",
    "purpose": "<In one simple sentence — why does this document exist and what is it used for>"
  },
  "fieldByFieldExplanation": [
    {
      "fieldName": "<Exact field name or label as it appears in the document>",
      "value": "<Exact value as it appears in the document>",
      "plainEnglishMeaning": "<What this field name means in everyday words>",
      "plainEnglishValue": "<What this specific value tells us in plain English>"
    }
  ],
  "technicalTermsExplained": [
    {
      "term": "<Technical, scientific, legal or jargon word found in the document>",
      "simpleExplanation": "<One sentence explanation using everyday language or a comparison>"
    }
  ],
  "unusualObservations": {
    "hasUnusualValues": <true | false>,
    "observations": [
      "<Each item describes one thing that looks unusual, missing, inconsistent, or concerning — use [] if everything looks normal>"
    ],
    "missingFields": [
      "<Fields or information you would normally expect in this type of document but are absent — use [] if nothing is missing>"
    ]
  },
  "plainEnglishSummary": "<4 to 5 sentences summarising the entire document in simple language that anyone with no technical background can understand>",
  "documentType": "<Repeat the document type here — e.g. COA | Invoice | Medical Report | Legal Contract | Other>",
  "completenessScore": <integer 0-100>
}

CRITICAL RULES:
- Your ENTIRE response must be ONE valid JSON object. Nothing before it, nothing after it.
- Do NOT add trailing commas after the last item in any array or object.
- Do NOT add any text, explanation, or comments outside the JSON.
- fieldByFieldExplanation: Go row by row, field by field. Never skip anything.
- technicalTermsExplained: Include every word a non-expert would not understand.
- Never return null for arrays — use [] instead.
- Respond ONLY with the JSON.`;

// ─── File type helpers ─────────────────────────────────────────────────────────
const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".txt") return "txt";
  if (ext === ".docx") return "docx";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
  return "other";
};

const getImageMediaType = (filename) => {
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[path.extname(filename).toLowerCase()] || "image/jpeg";
};

// ─── Robust JSON extractor ─────────────────────────────────────────────────────
// Handles GPT's most common JSON mistakes:
//   1. Markdown fences  ```json ... ```
//   2. Trailing commas before } or ]   ← THIS was your bug
//   3. Truncated / partial responses
function extractJSON(raw) {
  // Step 1: Strip markdown fences
  let text = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Step 2: Fix trailing commas  e.g.  ,}  or  ,]
  text = text.replace(/,\s*([}\]])/g, "$1");

  // Step 3: Direct parse attempt
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Step 4: Extract outermost { ... } block and retry
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(slice);
    } catch (_) {}
  }

  return null; // give up
}

// ─── GPT-4o Analysis ──────────────────────────────────────────────────────────
async function analyzeWithGPT4o(fileType, extractedText, fileBuffer, originalName, customPrompt = null) {
  const systemPrompt = customPrompt || PREDEFINED_PROMPT;
  let messages = [{ role: "system", content: systemPrompt }];

  if (fileType === "image") {
    const base64Image = fileBuffer.toString("base64");
    const mediaType = getImageMediaType(originalName);
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze this document: "${originalName}". Read every detail and return ONLY a valid JSON object — no text before or after.`,
        },
        {
          type: "image_url",
          image_url: { url: `data:${mediaType};base64,${base64Image}`, detail: "high" },
        },
      ],
    });
  } else {
    const truncatedText = extractedText.slice(0, 12000);
    messages.push({
      role: "user",
      content: `Document filename: "${originalName}"\n\nDocument content:\n${truncatedText}\n\nRead every field and value carefully. Return ONLY a valid JSON object — no text before or after.`,
    });
  }

  const response = await openaiClient.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages,
    max_tokens: 3500,
    temperature: 0.1,
  });

  const rawMessage = response.choices[0]?.message?.content?.trim() || "";
  const structured = extractJSON(rawMessage);

  if (structured) {
    console.log("✅ GPT-4o JSON parsed successfully.");
  } else {
    console.error("⚠️ GPT-4o returned non-parseable JSON. Raw snippet:", rawMessage.slice(0, 300));
  }

  const safe = structured || {
    documentOverview: {
      documentType: "Unknown",
      madeBy: "Could not determine",
      madeFor: "Could not determine",
      purpose: "Analysis could not be parsed from the GPT response.",
    },
    fieldByFieldExplanation: [],
    technicalTermsExplained: [],
    unusualObservations: {
      hasUnusualValues: false,
      observations: ["GPT response could not be parsed as valid JSON."],
      missingFields: [],
    },
    plainEnglishSummary: rawMessage.slice(0, 500) || "Analysis could not be parsed.",
    documentType: "Unknown",
    completenessScore: 0,
  };

  return {
    rawMessage,
    structured: safe,
    model: response.model || process.env.AZURE_OPENAI_DEPLOYMENT,
    tokens: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
    finishReason: response.choices[0]?.finish_reason || "unknown",
  };
}

// ─── UPLOAD DOCUMENT ──────────────────────────────────────────────────────────
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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

    const gptResponse = await analyzeWithGPT4o(
      fileType, extractedText, req.file.buffer, req.file.originalname, customPrompt
    );

    const s = gptResponse.structured;

    // ── Save to MongoDB ──
    // const doc = await Document.create({
    //   originalName: req.file.originalname,
    //   fileType: fileType === "image" ? "other" : fileType,
    //   fileSize: req.file.size,
    //   extractedText,
    //   wordCount,
    //   pageCount,
    //   status: "processed",
    //   gptResponse,
    //   customPrompt,
    //   analysisResult: {
    //     documentType: s.documentType,
    //     completenessScore: s.completenessScore,
    //     plainEnglishSummary: s.plainEnglishSummary,
    //     documentOverview: s.documentOverview,
    //     fieldByFieldExplanation: s.fieldByFieldExplanation,
    //     technicalTermsExplained: s.technicalTermsExplained,
    //     unusualObservations: s.unusualObservations,
    //   },
    // });
     const doc = await Document.create({
      originalName: req.file.originalname,
      fileType: fileType === "image" ? "other" : fileType,
      fileSize: req.file.size,
      extractedText,
      wordCount,
      pageCount,
      status: "processed",
      customPrompt,
      gptResponse: {
        rawMessage:  gptResponse.rawMessage,
        structured:  s,
        model:       gptResponse.model,
        tokens:      gptResponse.tokens,
        finishReason: gptResponse.finishReason,
      },
      // ✅ One clean save — matches the schema exactly
      analysisResult: {
        documentType:        s.documentType,
        completenessScore:   s.completenessScore,
        plainEnglishSummary: s.plainEnglishSummary,
        documentOverview:    s.documentOverview,
        fieldByFieldExplanation:  s.fieldByFieldExplanation  || [],
        technicalTermsExplained:  s.technicalTermsExplained  || [],
        unusualObservations:      s.unusualObservations || {
          hasUnusualValues: false,
          observations: [],
          missingFields: [],
        },
      },
    });

    // ✅ Single, clean response — no duplication
    res.status(201).json({
      success: true,
      message: "File uploaded and analyzed successfully",
      document: {
        _id:          doc._id,
        originalName: doc.originalName,
        fileType:     doc.fileType,
        fileSize:     doc.fileSize,
        wordCount:    doc.wordCount,
        pageCount:    doc.pageCount,
        status:       doc.status,
        uploadedAt:   doc.createdAt,

        analysisResult: doc.analysisResult,  // everything lives here

        gptResponse: {
          tokens:      gptResponse.tokens,
          model:       gptResponse.model,
          finishReason: gptResponse.finishReason,
        },
      },
    });
    //   res.status(201).json({
    //   success: true,
    //   message: "File uploaded and analyzed successfully",
    //   document: {
    //     _id: doc._id,
    //     originalName: doc.originalName,
    //     fileType: doc.fileType,
    //     fileSize: doc.fileSize,
    //     wordCount: doc.wordCount,
    //     pageCount: doc.pageCount,
    //     status: doc.status,
    //     uploadedAt: doc.createdAt,
    //     extractedText: doc.extractedText,

    //     documentType: s.documentType,
    //     completenessScore: s.completenessScore,
    //     plainEnglishSummary: s.plainEnglishSummary,

    //     analysisResult: {
    //       documentOverview: s.documentOverview,
    //       fieldByFieldExplanation: s.fieldByFieldExplanation,
    //       technicalTermsExplained: s.technicalTermsExplained,
    //       unusualObservations: s.unusualObservations,
    //       plainEnglishSummary: s.plainEnglishSummary,
    //       documentType: s.documentType,
    //       completenessScore: s.completenessScore,
    //     },

    //     gptResponse: {
    //       structured: s,
    //       tokens: gptResponse.tokens,
    //       model: gptResponse.model,
    //       finishReason: gptResponse.finishReason,
    //     },
    //   },
    // });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: err.message || "Upload failed" });
  }
};

// ─── GET ALL DOCUMENTS ────────────────────────────────────────────────────────
exports.getDocuments = async (req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET DOCUMENT BY ID ───────────────────────────────────────────────────────
exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: "Document not found" });
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── DELETE DOCUMENT ─────────────────────────────────────────────────────────
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: "Document not found" });
    res.status(200).json({ success: true, message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
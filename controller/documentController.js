const pdfParse = require("pdf-parse");
const Document = require("../model/documentModel");

// detect file type
const getFileType = (filename) => {
  if (filename.endsWith(".pdf")) return "pdf";
  if (filename.endsWith(".txt")) return "txt";
  if (filename.endsWith(".docx")) return "docx";
  return "other";
};

// ✅ FINAL ANALYSIS (MATCHES SCHEMA)
const analyzeText = (text) => {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // completeness (basic logic)
  let completenessScore = Math.min(100, Math.floor(wordCount / 5));

  // severity class
  let severityClass = "low";
  if (completenessScore < 40) severityClass = "high";
  else if (completenessScore < 70) severityClass = "medium";

  // missing fields (example logic)
  const missingFields = [];
  if (!/GSTN/i.test(text)) missingFields.push("GST Number");
  if (!/Email/i.test(text)) missingFields.push("Email");
  if (!/Mobile/i.test(text)) missingFields.push("Mobile");

  // entity count (basic name detection)
  const entityCount = (text.match(/\b[A-Z][a-z]+\b/g) || []).length;

  // duplicate risk (dummy)
  const duplicateRisk = wordCount > 1000;

  return {
    completenessScore,
    severityClass,
    entityCount,
    missingFields,
    duplicateRisk,
    summaryText: text.substring(0, 150),
  };
};

// ✅ UPLOAD DOCUMENT
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileType = getFileType(req.file.originalname);
    let extractedText = "";
    let pageCount = 1;

    // ✅ TEXT EXTRACTION
    if (fileType === "pdf") {
      const parsed = await pdfParse(req.file.buffer);
      extractedText = parsed.text || "";
      pageCount = parsed.numpages || 1;
    } else if (fileType === "txt") {
      extractedText = req.file.buffer.toString("utf8");
    } else {
      extractedText = "[DOCX parsing not implemented]";
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

    // ✅ ANALYSIS
    const analysisResult = analyzeText(extractedText);

    // ✅ SAVE
    const doc = await Document.create({
      originalName: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      extractedText,
      wordCount,
      pageCount,
      status: "processed",
      analysisResult,
    });

    // ✅ RESPONSE
    res.status(201).json({
      success: true,
      message: "File uploaded and processed successfully",
      document: doc,
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Upload failed",
    });
  }
};

// ✅ GET ALL DOCUMENTS
exports.getDocuments = async (req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// ✅ GET DOCUMENT BY ID
exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// ✅ DELETE DOCUMENT
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
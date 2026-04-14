const pdfParse = require("pdf-parse");
const Document = require("../model/documentModel");
const { analyzeDocument } = require("../services/aiService");
const { getFileType } = require("../utils/Filehelpers");
const { sendNotification } = require("./notificationController");
const User = require("../model/addUserModel");
const { Types } = require("mongoose");

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?._id ?? req.body.userId;
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
        extractedText = "[Scanned PDF — content extracted via GPT-4o Vision]";
      }
    } else if (fileType === "txt") {
      extractedText = req.file.buffer.toString("utf8");
    } else if (fileType === "image") {
      extractedText = "[Image — content extracted via GPT-4o Vision]";
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const customPrompt = req.body.prompt || null;

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
   
    return res
      .status(500)
      .json({ success: false, error: err.message || "Upload failed" });
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

    // ✅ staffUsers = array, forEach se loop karo
    const staffUsers = await User.find(
      { role: { $in: ['reviewer', 'admin'] } },
      '_id'
    );

    const analystName = req.user.name || req.user.email || 'An analyst';

    // ✅ har ek staff member ko notify karo
    staffUsers.forEach((staff) => {
      sendNotification(staff._id, {
        type: 'DOCUMENT_SUBMITTED',
        documentName: doc.originalName,
        message: `${analystName} submitted "${doc.originalName}" for review.`,
      })
    })

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
      return res
        .status(404)
        .json({ success: false, error: "Document not found" });
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

    sendNotification(doc.userId, {
      type: 'DOCUMENT_REVIEWED',
      documentName: doc.originalName,
      status: doc.status,
      message: `Your document "${doc.originalName}" has been ${doc.status}.`,
    })

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
    
    return res
      .status(500)
      .json({ success: false, error: err.message || "Review failed" });
  }
};


exports.getDocuments = async (req, res) => {
  try {
    const { role, _id: loggedInUserId } = req.user;

    let matchFilter = {};

    if (role === "analyst") {
      matchFilter = { userId: new Types.ObjectId(loggedInUserId) };
    } else if (role === "reviewer" || role === "admin") {
      matchFilter = {
        $or: [
          { status: "pending_review" },
          { status: "approved" },
          { status: "rejected" },
          { status: "deleted" },
          { reviewedBy: new Types.ObjectId(loggedInUserId) },
        ],
      };
    } else {
      return res.status(403).json({
        success: false,
        error: "Forbidden — insufficient role",
      });
    }

    const docs = await Document.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewedBy",
        },
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$reviewedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          userId: { _id: 1, name: 1, email: 1, role: 1 },
          originalName: 1,
          fileType: 1,
          fileSize: 1,
          wordCount: 1,
          pageCount: 1,
          status: 1,
          isSubmitted: 1,
          submittedAt: 1,
          reviewedAt: 1,
          reviewedBy: { _id: 1, name: 1, email: 1, role: 1 },
          reviewNote: 1,
          analysisResult: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const docs = await Document.aggregate([
      { $match: { _id: new Types.ObjectId(req.params.id) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewedBy",
        },
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$reviewedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          userId: { _id: 1, name: 1, email: 1, role: 1 },
          originalName: 1,
          fileType: 1,
          fileSize: 1,
          wordCount: 1,
          pageCount: 1,
          status: 1,
          isSubmitted: 1,
          submittedAt: 1,
          reviewedAt: 1,
          reviewedBy: { _id: 1, name: 1, email: 1, role: 1 },
          reviewNote: 1,
          analysisResult: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!docs.length) {
      return res
        .status(404)
        .json({ success: false, error: "Document not found" });
    }

    return res.status(200).json({ success: true, data: docs[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc)
      return res
        .status(404)
        .json({ success: false, error: "Document not found" });

    doc.status = "deleted";
    doc.deletedAt = new Date();
    await doc.save();

    const staffUsers = await User.find(
      { role: { $in: ['reviewer', 'admin'] } },
      '_id'
    );

    const analystName = req.user.name || req.user.email || 'An analyst';

    staffUsers.forEach((staffUser) => {
      sendNotification(staffUser._id, {
        type: 'DOCUMENT_DELETED',
        documentName: doc.originalName,
        message: `${analystName} deleted "${doc.originalName}".`,
      })
    })

    res
      .status(200)
      .json({
        success: true,
        message: "Document deleted successfully",
        status: doc.status,
      });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

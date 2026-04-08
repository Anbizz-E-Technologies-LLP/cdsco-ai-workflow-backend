// services/aiService.js
require("dotenv").config(); // add this line at the top
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyze a file (PDF or image) using Claude's vision capabilities.
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileType - "pdf", "png", "jpg", "jpeg"
 * @param {string} originalName - Original file name
 * @returns {object} Structured analysis result
 */
async function analyzeFileWithAI(fileBuffer, fileType, originalName) {
  // Convert buffer to base64
  const base64Data = fileBuffer.toString("base64");

  // Map file type to Claude media type
  const mediaTypeMap = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };

  const mediaType = mediaTypeMap[fileType.toLowerCase()];
  if (!mediaType) {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Build the content block based on file type
  let fileContentBlock;

  if (fileType.toLowerCase() === "pdf") {
    fileContentBlock = {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64Data,
      },
    };
  } else {
    // Image types (png, jpg, jpeg, webp, gif)
    fileContentBlock = {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Data,
      },
    };
  }

  const prompt = `You are a document analysis expert. Analyze this document/image carefully and extract all information from it.

Respond ONLY with a valid JSON object (no markdown, no backticks, no extra text) in this exact format:

{
  "documentType": "type of document (e.g. Certificate of Analysis, Invoice, Report, etc.)",
  "summary": "2-3 sentence summary of what this document contains",
  "extractedFields": {
    "key field name": "value",
    ...all important fields you can find...
  },
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "missingFields": ["any important fields that seem missing or incomplete"],
  "qualityScore": 85,
  "qualityReason": "Brief reason for the quality score",
  "entities": {
    "organizations": ["org1", "org2"],
    "dates": ["date1", "date2"],
    "products": ["product1"],
    "people": ["person1"]
  },
  "complianceFlags": ["any compliance issues or warnings"],
  "rawTextSummary": "Key text content extracted from the document"
}

Be thorough. Extract ALL visible fields, values, dates, names, numbers, and important information from the document.`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          fileContentBlock,
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  // Parse the JSON response
  const rawText = response.content[0].text.trim();

  // Strip markdown fences if present
  const clean = rawText.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    return {
      success: true,
      ...parsed,
    };
  } catch (parseErr) {
    // If JSON parsing fails, return raw text as summary
    return {
      success: false,
      documentType: "Unknown",
      summary: rawText.slice(0, 500),
      extractedFields: {},
      keyFindings: [],
      missingFields: [],
      qualityScore: 0,
      qualityReason: "Could not parse AI response",
      entities: {},
      complianceFlags: [],
      rawTextSummary: rawText,
    };
  }
}

module.exports = analyzeFileWithAI;
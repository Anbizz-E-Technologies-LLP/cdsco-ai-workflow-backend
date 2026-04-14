const OpenAI = require("openai");
const { PREDEFINED_PROMPT } = require("../utils/prompts");
const { getImageMediaType } = require("../utils/Filehelpers");

const openaiClient = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: { "api-key": process.env.AZURE_OPENAI_KEY },
});


const extractJSON = (raw) => {
  let text = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  text = text.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(text);
  } catch (_) {}

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = text
      .slice(firstBrace, lastBrace + 1)
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(slice);
    } catch (_) {}
  }

  return null;
};


const buildFallback = (rawMessage) => ({
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
  plainEnglishSummary:
    rawMessage.slice(0, 500) || "Analysis could not be parsed.",
  documentType: "Unknown",
  completenessScore: 0,
});

const analyzeDocument = async ({
  fileType,
  extractedText,
  fileBuffer,
  originalName,
  customPrompt = null,
}) => {
  const systemPrompt = customPrompt || PREDEFINED_PROMPT;
  const messages = [{ role: "system", content: systemPrompt }];

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
          image_url: {
            url: `data:${mediaType};base64,${base64Image}`,
            detail: "high",
          },
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
    console.log("Parsed successfully.");
  } else {
    console.error(
      "Non-parseable JSON.",
      rawMessage.slice(0, 300)
    );
  }

  return {
    rawMessage,
    structured: structured || buildFallback(rawMessage),
    model: response.model || process.env.AZURE_OPENAI_DEPLOYMENT,
    tokens: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
    finishReason: response.choices[0]?.finish_reason || "unknown",
  };
};

module.exports = { analyzeDocument };
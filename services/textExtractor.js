const { extractRawText } = require("./pdfExtractor");

 async function extractFromDocx(buffer) {
  try {
    const mammoth = require("mammoth");
    const result  = await mammoth.extractRawText({ buffer });
    const rawText = (result.value || "").replace(/\n{3,}/g, "\n\n").trim();
    return { rawText, pageCount: 1, method: "mammoth-docx" };
  } catch (err) {
     return { rawText: "", pageCount: 1, method: "docx-failed" };
  }
}

 function extractFromTxt(buffer) {
  const rawText = buffer.toString("utf8").replace(/\n{3,}/g, "\n\n").trim();
  return { rawText, pageCount: 1, method: "utf8-txt" };
}

 async function extractFromImage(buffer, openaiClient) {
  const base64 = buffer.toString("base64");
  try {
    const res = await openaiClient.chat.completions.create({
      model:       process.env.AZURE_OPENAI_DEPLOYMENT,
      temperature: 0,
      max_tokens:  2000,
      messages: [
        { role: "system", content: "Extract ALL text from this image exactly as it appears. Preserve table structure. Output ONLY the raw text." },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all text from this document image." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" } },
          ],
        },
      ],
    });
    const rawText = res.choices[0]?.message?.content?.trim() || "";
    return { rawText, pageCount: 1, method: "vision-image" };
  } catch (err) {
     return { rawText: "", pageCount: 1, method: "image-failed" };
  }
}

 async function extractText(buffer, fileType, openaiClient) {
  const type = (fileType || "").toLowerCase();

  if (type === "pdf")                                         return extractRawText(buffer, openaiClient);
  if (type === "docx" || type.includes("wordprocessingml"))  return extractFromDocx(buffer);
  if (type === "txt"  || type === "text/plain")              return extractFromTxt(buffer);
  if (type === "image" || type.startsWith("image/"))         return extractFromImage(buffer, openaiClient);

   return extractFromTxt(buffer);
}

module.exports = { extractText };
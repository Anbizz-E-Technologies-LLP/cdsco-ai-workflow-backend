const pdfParse = require("pdf-parse");

const MIN_CHARS       = 30;
const OCR_CONCURRENCY = 10;  
const RENDER_SCALE    = 1.5;  

const hasContent = (t = "") => t.replace(/\s/g, "").length >= MIN_CHARS;
const sleep      = (ms) => new Promise((r) => setTimeout(r, ms));

async function extractDigitalText(buffer) {
  const pageTexts = [];
  try {
    await pdfParse(buffer, {
      pagerender: async (pageData) => {
        try {
          const content = await pageData.getTextContent();
          pageTexts.push(content.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim());
        } catch (_) { pageTexts.push(""); }
        return "";
      },
    });
  } catch (_) {}

  if (pageTexts.length === 0 || pageTexts.every((t) => !t.trim())) {
    try {
      const parsed = await pdfParse(buffer);
      const pages  = (parsed.text || "").split(/\f/);
      for (let i = 0; i < (parsed.numpages || 1); i++) {
        pageTexts.push((pages[i] || "").replace(/\s+/g, " ").trim());
      }
    } catch (_) {}
  }
  return pageTexts;
}

async function renderPage(buffer, pageNum) {
  const { pdfToPng } = require("pdf-to-png-converter");
  const pages = await pdfToPng(buffer, {
    disableFontFace:  true,
    useSystemFonts:  true,
    enableXfa:       false,
    viewportScale:   RENDER_SCALE,  
    pagesToProcess: [pageNum],
    strictPagesToProcess: false,
  });
  if (!pages?.length) throw new Error(`No image for page ${pageNum}`);
  const buf = pages[0].content;
  return Buffer.isBuffer(buf) ? buf.toString("base64") : String(buf);
}

async function ocrOnePage(base64Png, pageNum, totalPages, openaiClient, attempt = 1) {
  try {
    const res = await openaiClient.chat.completions.create({
      model:       process.env.AZURE_OPENAI_DEPLOYMENT,
      temperature: 0,
      max_tokens:  2000,   
      messages: [
        {
          role:    "system",
          content: [
            "You are a pharmaceutical document OCR specialist.",
            "",
            "TASK: Extract ALL text from this document page image with ZERO omissions.",
            "",
            "CRITICAL RULES FOR TABLES:",
            "- Extract EVERY row — never skip, never summarise.",
            "- Format each table row as: Sr.No | Parameter | Specification | Result",
            "  Example: 7A | Highest Individual known Impurity [BY HPLC] | NMT 1.0% | 0.18",
            "- For nested sub-rows (Related Substances, Residual Solvents), give each its own line.",
            "- Preserve exact values: '0.18', 'NMT 1.0%', 'Complies', 'Not detected', 'ND'.",
            "- Do NOT merge rows. Do NOT skip rows.",
            "",
            "RULES FOR CHROMATOGRAM PAGES:",
            "- Extract the peak table: Sr.No | RT [min] | Area | Area % | Symmetry",
            "- Include Sample Name, Operator, Injection Date, Method.",
            "",
            "OUTPUT: Only the raw extracted text. No explanations, no JSON, no markdown.",
            "If the page has no text at all, output exactly: [BLANK PAGE]",
          ].join("\n"),
        },
        {
          role:    "user",
          content: [
            {
              type: "text",
              text: `Page ${pageNum} of ${totalPages}. Extract ALL text including EVERY table row. Do not skip any row.`,
            },
            {
              type:      "image_url",
              image_url: { url: `data:image/png;base64,${base64Png}`, detail: "high" },
            },
          ],
        },
      ],
    });

    const text   = (res.choices[0]?.message?.content || "").trim();
    const tokens = res.usage?.total_tokens || 0;
    const chars  = text.replace(/\s/g, "").length;

    if (text === "[BLANK PAGE]" || chars === 0) {
      return "";
    }
    return text;

  } catch (err) {
    if (attempt <= 2 && (err.status === 429 || err.status >= 500)) {
      await sleep(attempt * 2500);
      return ocrOnePage(base64Png, pageNum, totalPages, openaiClient, attempt + 1);
    }
     return "";
  }
}

async function processPage(buffer, pageNum, totalPages, openaiClient) {
  try {
    const b64  = await renderPage(buffer, pageNum);
    const text = await ocrOnePage(b64, pageNum, totalPages, openaiClient);
    return { pageNum, text };
  } catch (err) {
     return { pageNum, text: "" };
  }
}


async function runParallelOcr(buffer, pageCount, openaiClient) {
   const results = new Array(pageCount).fill("");
  let   cursor  = 1;

  async function worker() {
    while (cursor <= pageCount) {
      const pageNum = cursor++;
      const { text } = await processPage(buffer, pageNum, pageCount, openaiClient);
      results[pageNum - 1] = text;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(OCR_CONCURRENCY, pageCount) }, worker)
  );

  const readable = results.filter(hasContent).length;
   return results;
}

async function extractRawText(buffer, openaiClient) {
  let pageCount = 1;
  try { const p = await pdfParse(buffer); pageCount = p.numpages || 1; } catch (_) {}

  const digitalPages = await extractDigitalText(buffer);
  const readable     = digitalPages.filter(hasContent).length;
  const total        = digitalPages.length || pageCount;
  const threshold    = Math.max(1, Math.ceil(total * 0.3));

  if (readable >= threshold) {
    const rawText = digitalPages.map((t, i) => `[PAGE ${i+1}]\n${t || "[NO TEXT]"}`).join("\n\n");
     return { rawText, pageCount: total, method: "pdf-parse-digital" };
  }
  if (!openaiClient) {
    return { rawText: "", pageCount, method: "failed-no-client" };
  }

  const visionPages = await runParallelOcr(buffer, pageCount, openaiClient);
  const vReadable   = visionPages.filter(hasContent).length;
  const rawText     = visionPages
    .map((t, i) => `[PAGE ${i+1}]\n${(t || "").trim() || "[NO TEXT]"}`)
    .join("\n\n");

  if (vReadable === 0) {
    console.error("Vision OCR returned nothing check Azure gpt-4o Vision support");
  }

  return { rawText, pageCount: visionPages.length || pageCount, method: "vision-ocr" };
}

module.exports = { extractRawText };
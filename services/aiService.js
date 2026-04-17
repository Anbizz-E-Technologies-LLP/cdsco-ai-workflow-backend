const OpenAI  = require("openai");
const { PREDEFINED_PROMPT, MERGE_PROMPT } = require("../utils/prompts");

const openaiClient = new OpenAI({
  apiKey:         process.env.AZURE_OPENAI_KEY,
  baseURL:        `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery:   { "api-version": process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: { "api-key": process.env.AZURE_OPENAI_KEY },
});

const MAX_CHARS   = 8000;   
const MAX_CHUNKS  = 50;
const CONCURRENCY = 8;     
const MAX_RETRIES = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseJSON(raw) {
  if (!raw) return null;
  let s = raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
  s = s.replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(s); } catch (_) {}
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) {
    try { return JSON.parse(s.slice(a, b+1).replace(/,\s*([}\]])/g,"$1")); } catch (_) {}
  }
  return null;
}

function fallback(idx, reason) {
  return {
    chunkIndex: idx, pageRange: `Page ${idx}`, chunkType: "OTHER",
    productInfo: { productName:null, batchNumber:null, casNumber:null, manufacturer:null, grade:null, analysisDate:null, mfgDate:null, retestOrExpiryDate:null, batchSize:null, documentId:null },
    fields: [], testResults: [],
    hplcData: { isPresent:false, sampleName:null, operator:null, injectionDate:null, method:null, peaks:[] },
    signatures: { preparedBy:null, checkedBy:null, approvedBy:null },
    storageAndShelfLife: { storageConditions:null, manufacturingDate:null, expiryOrRetestDate:null, shelfLifeMonths:null },
    remarks: null, chunkAlerts: [],
    validation: { overallVerdict:"UNREADABLE", completenessScore:0, totalTestsFound:0, totalPassed:0, totalFailed:0, totalWarnings:0, missingFields:[reason], inconsistencies:[], gdpObservations:[] },
    chunkSummary: { objective:"Unknown", keyFindings:[], riskPoints:[reason], actionItems:["Re-analyse"] },
    technicalTerms: [], analysisConfidence: 0,
  };
}


function mergeFieldsAndTests(fields = [], testResults = [], pageLabel = "") {
  const unified = [];
  const seen    = new Set();

  for (const t of testResults) {
    const key = `${t.srNo}|${t.parameterName}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unified.push({
        srNo:                t.srNo || null,
        fieldName:           t.parameterName || t.fieldName || "",
        value:               t.result        || t.value     || "",
        unit:                t.unit          || null,
        specification:       t.specification || null,
        passOrFail:          t.status        || t.passOrFail || "N/A",
        percentageOfLimit:   t.percentageOfLimit || "N/A",
        plainEnglishMeaning: t.plainEnglishTest   || t.plainEnglishMeaning || "",
        plainEnglishValue:   t.plainEnglishResult  || t.plainEnglishValue  || "",
        isCritical:          t.isSeriousConcern    || t.isCritical || false,
        riskFlag:            t.riskFlag || false,
        sourceLocation:      t.sourceLocation || pageLabel,
        sourceUrl:           t.sourceUrl || null,
      });
    }
  }

  for (const f of fields) {
    const key = `${f.srNo||""}|${f.fieldName}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unified.push({
        srNo:                f.srNo || null,
        fieldName:           f.fieldName  || "",
        value:               f.value      || "",
        unit:                f.unit       || null,
        specification:       f.specification || null,
        passOrFail:          f.passOrFail || "N/A",
        percentageOfLimit:   f.percentageOfLimit || "N/A",
        plainEnglishMeaning: f.plainEnglishMeaning || "",
        plainEnglishValue:   f.plainEnglishValue   || "",
        isCritical:          f.isCritical || false,
        riskFlag:            f.riskFlag   || false,
        sourceLocation:      f.sourceLocation || pageLabel,
        sourceUrl:           f.sourceUrl || null,
      });
    }
  }

  return unified;
}

function buildChunks(rawText) {
  const chunks  = [];
  const markers = [...rawText.matchAll(/\[PAGE (\d+)\]/g)];

  if (markers.length > 0) {
    const pages = markers.map((m, i) => {
      const start   = m.index + m[0].length;
      const end     = i + 1 < markers.length ? markers[i+1].index : rawText.length;
      const pageNum = parseInt(m[1], 10);
      const text    = rawText.slice(start, end).trim();
      return { pageNum, text };
    }).filter(p => p.text && p.text !== "[NO TEXT]");

    let i = 0;
    while (i < pages.length && chunks.length < MAX_CHUNKS) {
      const a = pages[i];
      const b = i + 1 < pages.length ? pages[i+1] : null;

      if (b) {
        const combined = a.text + "\n\n" + b.text;
        if (combined.length <= MAX_CHARS) {
          chunks.push({ idx: chunks.length + 1, text: combined, label: `Pages ${a.pageNum}-${b.pageNum}` });
          i += 2;
          continue;
        }
      }

      if (a.text.length <= MAX_CHARS) {
        chunks.push({ idx: chunks.length + 1, text: a.text, label: `Page ${a.pageNum}` });
        i += 1;
      } else {
        let offset = 0, part = 0;
        while (offset < a.text.length && chunks.length < MAX_CHUNKS) {
          let cut = offset + MAX_CHARS;
          if (cut < a.text.length) { const br = a.text.lastIndexOf("\n\n", cut); if (br > offset + 500) cut = br; }
          chunks.push({ idx: chunks.length + 1, text: a.text.slice(offset, cut).trim(), label: `Page ${a.pageNum} pt${++part}` });
          offset = cut;
        }
        i += 1;
      }
    }
  }

  if (chunks.length === 0) {
    let offset = 0, idx = 1;
    const text = rawText.trim();
    while (offset < text.length && chunks.length < MAX_CHUNKS) {
      let cut = offset + MAX_CHARS;
      if (cut < text.length) { const br = text.lastIndexOf("\n\n", cut); if (br > offset + 500) cut = br; }
      chunks.push({ idx: idx++, text: text.slice(offset, cut).trim(), label: `Chunk ${idx-1}` });
      offset = cut;
    }
  }
  return chunks;
}

async function analyseChunk(chunk, total, attempt = 1) {
  const { idx, text, label } = chunk;
  if (!text || text.length < 15) {
    return { idx, parsed: fallback(idx, "Empty chunk"), tokens: 0, ok: false };
  }

  const msg =
    `Chunk ${idx} of ${total}. ${label}.\n` +
    `IMPORTANT: Extract EVERY row from EVERY table. testResults[] must have one entry per row — do not skip any.\n` +
    `Set "chunkIndex": ${idx}, "pageRange": "${label}".\n` +
    `Return ONLY valid JSON.\n\n` +
    `─── RAW TEXT ────────────────────────────────────────────────\n${text}\n` +
    `─────────────────────────────────────────────────────────────`;

  try {
    const res = await openaiClient.chat.completions.create({
      model:       process.env.AZURE_OPENAI_DEPLOYMENT,
      temperature: 0.1,
      max_tokens:  6000,
      messages: [
        { role: "system", content: PREDEFINED_PROMPT },
        { role: "user",   content: msg },
      ],
    });

    const parsed = parseJSON(res.choices[0]?.message?.content?.trim() || "");
    if (!parsed) {
      if (attempt < MAX_RETRIES) { await sleep(1200 * attempt); return analyseChunk(chunk, total, attempt + 1); }
      return { idx, parsed: fallback(idx, "Invalid JSON"), tokens: res.usage?.total_tokens || 0, ok: false };
    }

    parsed.chunkIndex = idx;


    const unified = mergeFieldsAndTests(parsed.fields || [], parsed.testResults || [], label);
    parsed._unifiedFields = unified;  

    const fc = unified.length;
    return { idx, parsed, tokens: res.usage?.total_tokens || 0, ok: true };

  } catch (err) {
    if (attempt < MAX_RETRIES && (err.status === 429 || err.status >= 500)) {
      await sleep(attempt * 2000);
      return analyseChunk(chunk, total, attempt + 1);
    }
    return { idx, parsed: fallback(idx, err.message), tokens: 0, ok: false };
  }
}

async function runPipeline(chunks) {
  const results    = new Array(chunks.length);
  let totalTokens  = 0;
  let cursor       = 0;

  async function worker() {
    while (cursor < chunks.length) {
      const i = cursor++;
      results[i]   = await analyseChunk(chunks[i], chunks.length);
      totalTokens += results[i].tokens;
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));

  const ok = results.filter(r => r.ok).length;
  return { results, totalTokens };
}

async function mergeChunks(chunkResults, totalPages) {
  const summaries = chunkResults.map(r => {
    const p = r.parsed;
    const unified = p._unifiedFields || mergeFieldsAndTests(p.fields||[], p.testResults||[]);
    return {
      chunkIndex:   r.idx,
      pageRange:    p.pageRange,
      chunkType:    p.chunkType,
      productName:  p.productInfo?.productName,
      batchNumber:  p.productInfo?.batchNumber,
      manufacturer: p.productInfo?.manufacturer,
      casNumber:    p.productInfo?.casNumber,
      analysisDate: p.productInfo?.analysisDate,
      mfgDate:      p.productInfo?.mfgDate,
      retestDate:   p.productInfo?.retestOrExpiryDate,
      batchSize:    p.productInfo?.batchSize,
      documentId:   p.productInfo?.documentId,
      verdict:      p.validation?.overallVerdict,
      score:        p.validation?.completenessScore,
      passed:       p.validation?.totalPassed,
      failed:       p.validation?.totalFailed,
      storage:      p.storageAndShelfLife?.storageConditions,
      remarks:      p.remarks,
      signatures:   p.signatures,
      alerts:       (p.chunkAlerts ?? []).slice(0, 5),
      findings:     (p.chunkSummary?.keyFindings ?? []).slice(0, 5),
      missing:      p.validation?.missingFields ?? [],
      ok:           r.ok,
       fields:       unified.map(f =>
        `${f.srNo||""} | ${f.fieldName} | spec:${f.specification||"N/A"} | result:${f.value} | ${f.passOrFail} | ${f.percentageOfLimit}`
      ).join("\n").slice(0, 1200),  
    };
  });

  const payload = JSON.stringify(summaries, null, 2);

  try {
    const res = await openaiClient.chat.completions.create({
      model:       process.env.AZURE_OPENAI_DEPLOYMENT,
      temperature: 0.1,
      max_tokens:  8000,
      messages: [
        { role: "system", content: MERGE_PROMPT },
        {
          role:    "user",
          content: `Merge ${chunkResults.length} chunks from a ${totalPages}-page pharmaceutical document.\nReturn ONLY valid JSON.\n\n${payload}`,
        },
      ],
    });

    const merged = parseJSON(res.choices[0]?.message?.content?.trim() || "");
    if (!merged) {
      return { merged: null, mt: res.usage?.total_tokens || 0 };
    }
    return { merged, mt: res.usage?.total_tokens || 0 };
  } catch (err) {
    return { merged: null, mt: 0 };
  }
}

function buildFinal(chunkResults, merged, totalPages) {
  if (merged) {
  
    const mergedWithFullFields = { ...merged, totalPages, totalChunksProcessed: chunkResults.length };

    if (mergedWithFullFields.documents?.length > 0) {
      mergedWithFullFields.documents = mergedWithFullFields.documents.map(doc => {
        const docChunkIndices = new Set(doc.chunkIndices || []);
        const relevantChunks  = chunkResults.filter(r => docChunkIndices.has(r.idx));

        if (relevantChunks.length === 0) return doc;

        const allChunkFields = relevantChunks.flatMap(r => {
          const p = r.parsed;
          return p._unifiedFields || mergeFieldsAndTests(p.fields||[], p.testResults||[], p.pageRange||`Chunk ${r.idx}`);
        });

        const mergedFieldNames = new Set((doc.fields||[]).map(f => (f.fieldName||"").toLowerCase()));
        const extraFromChunks  = allChunkFields.filter(f =>
          !mergedFieldNames.has((f.fieldName||"").toLowerCase())
        );

        return {
          ...doc,
          fields: [...(doc.fields || []), ...extraFromChunks],
        };
      });
    }

    return mergedWithFullFields;
  }

  if (chunkResults.length === 1 && chunkResults[0].ok) {
    const r    = chunkResults[0];
    const p    = r.parsed;
    const info = p.productInfo ?? {};
    const val  = p.validation  ?? {};
    const alerts = p.chunkAlerts ?? [];
    const critical = alerts.some(a => ["CRITICAL","HIGH"].includes(a.alertLevel));
    const risk     = critical ? "HIGH" : alerts.some(a => a.alertLevel==="MEDIUM") ? "MEDIUM" : "LOW";
    const pass     = (val.totalFailed ?? 0) === 0 && !critical;

    const allFields = p._unifiedFields || mergeFieldsAndTests(p.fields||[], p.testResults||[], p.pageRange||"Page 1");

    return {
      documentSetType: "SINGLE", documentCount: 1,
      documentType:    p.chunkType === "COA" ? "COA" : "OTHER",
      completenessScore: val.completenessScore ?? 0,
      totalPages, totalChunksProcessed: 1,
      documentOverview: {
        documentType:  p.chunkType ?? "COA",
        madeBy:        info.manufacturer ?? null,
        madeFor:       null,
        purpose:       `Analysis of ${info.productName ?? "document"}`,
        coversPeriod:  info.analysisDate ?? null,
        uniqueProducts: info.productName ? [info.productName] : [],
        uniqueBatches:  info.batchNumber ? [info.batchNumber] : [],
        jurisdiction:  "Unknown",
      },
      documents: [{
        docIndex:     1,
        documentType: p.chunkType ?? "COA",
        documentTitle: info.productName ?? "Unknown",
        issuedBy:     info.manufacturer ?? null,
        issuedTo:     null,
        documentDate: info.analysisDate ?? null,
        documentId:   info.batchNumber ?? info.documentId ?? null,
        pageRange:    p.pageRange ?? "Page 1",
        chunkIndices: [1],
        storageCondition: p.storageAndShelfLife?.storageConditions ?? null,
        conclusion:   pass ? "COMPLIES" : "REQUIRES_REVIEW",
        remarks:      p.remarks ?? null,
        fields:       allFields,  
        supportingData: p.hplcData?.isPresent ? [{
          dataType:      "HPLC",
          sampleName:    p.hplcData.sampleName,
          operator:      p.hplcData.operator,
          injectionDate: p.hplcData.injectionDate,
          runTime:       null,
          method:        p.hplcData.method,
          peaks:         p.hplcData.peaks ?? [],
        }] : [],
        signatures: p.signatures ?? { preparedBy:null, checkedBy:null, reviewedBy:null, approvedBy:null, signedDate:null },
        sensitiveData: [],
        validation: {
          completenessScore: val.completenessScore ?? 0,
          allChecksPassed:   pass,
          overallVerdict:    pass ? "COMPLIES" : "DOES_NOT_COMPLY",
          verdictReason:     pass ? "All tests passed" : `${val.totalFailed ?? 0} test(s) failed`,
          failedItems:       val.missingFields ?? [],
          warnings:          [],
          criticalErrors:    [],
        },
      }],
      comparison: { isAvailable:false, entitySummaryTable:[], fieldComparison:[], crossDocumentInsights:[] },
      riskAnalysis: {
        overallRiskLevel: risk,
        riskItems: alerts.map((a, i) => ({
          riskId:            `R${String(i+1).padStart(3,"0")}`,
          severity:          a.alertLevel ?? "LOW",
          category:          "Quality",
          description:       a.alertDetail ?? a.alertTitle,
          affectedDocuments: [1],
          affectedFields:    [a.affectedField ?? "Unknown"],
          sourceLocation:    "Page 1",
          recommendation:    a.recommendedAction ?? "Review",
          sourceUrl:         a.sourceUrl ?? null,
        })),
      },
      sourceCitations: [],
      smartSummary: {
        objective:   p.chunkSummary?.objective ?? `Analysis of ${info.productName ?? "document"}`,
        scope:       `${info.productName ?? "Unknown"}, Batch: ${info.batchNumber ?? "Unknown"}`,
        keyFindings: p.chunkSummary?.keyFindings ?? [],
        riskSummary: alerts.length === 0 ? "No issues." : `${alerts.length} alerts found.`,
        actionItems: p.chunkSummary?.actionItems ?? [],
        overallConclusion: pass ? "COMPLIES" : "DOES_NOT_COMPLY",
        plainEnglishSummary: `${p.chunkType ?? "Document"} for ${info.productName ?? "product"}${info.batchNumber ? ` (Batch ${info.batchNumber})` : ""}: ${val.totalPassed ?? 0}/${val.totalTestsFound ?? 0} tests passed. Completeness: ${val.completenessScore ?? 0}%.`,
        technicalGlossary: p.technicalTerms ?? [],
      },
      classificationAndPriority: {
        category:          "Routine Quality Check",
        priorityLevel:     risk === "HIGH" ? "High" : risk === "MEDIUM" ? "Medium" : "Low",
        priorityReason:    pass ? "All tests passed" : `${val.totalFailed ?? 0} test(s) failed`,
        recommendedAction: pass ? "Approve" : "Flag for Review",
      },
    };
  }

   const all      = chunkResults.map(r => r.parsed);
  const products = [...new Set(all.map(c => c.productInfo?.productName).filter(Boolean))];
  const batches  = [...new Set(all.map(c => c.productInfo?.batchNumber).filter(Boolean))];
  const alerts   = all.flatMap(c => c.chunkAlerts ?? []);
  const avgScore = Math.round(all.reduce((s,c) => s + (c.validation?.completenessScore??0), 0) / Math.max(all.length,1));
  const tTests   = all.reduce((s,c) => s + (c.validation?.totalTestsFound??0), 0);
  const tPass    = all.reduce((s,c) => s + (c.validation?.totalPassed??0), 0);
  const tFail    = all.reduce((s,c) => s + (c.validation?.totalFailed??0), 0);
  const risk     = alerts.some(a => ["CRITICAL","HIGH"].includes(a.alertLevel)) ? "HIGH"
    : alerts.some(a => a.alertLevel==="MEDIUM") ? "MEDIUM" : "LOW";

   const allUnifiedFields = chunkResults.flatMap(r => {
    const p = r.parsed;
    const unified = p._unifiedFields || mergeFieldsAndTests(p.fields||[], p.testResults||[], p.pageRange||`Page ${r.idx}`);
     return unified.map(f => ({
      ...f,
      sourceLocation: f.sourceLocation || p.pageRange || `Page ${r.idx}`,
    }));
  });


  return {
    documentSetType: "SINGLE", documentCount: 1, documentType: "COA",
    completenessScore: avgScore, totalPages, totalChunksProcessed: chunkResults.length,
    documentOverview: {
      documentType:  "COA",
      madeBy:        null, madeFor: null, purpose: "Document Bundle", coversPeriod: null,
      uniqueProducts: products, uniqueBatches: batches, jurisdiction: "Unknown",
    },
    documents: [{
      docIndex: 1, documentType: "COA",
      documentTitle:  products[0] ?? "Unknown",
      issuedBy:       null, issuedTo: null, documentDate: null,
      documentId:     batches[0] ?? null,
      pageRange:      `Pages 1-${totalPages}`,
      chunkIndices:   chunkResults.map(r => r.idx),
      storageCondition: all.find(c => c.storageAndShelfLife?.storageConditions)?.storageAndShelfLife?.storageConditions ?? null,
      conclusion:     tFail > 0 ? "DOES_NOT_COMPLY" : "REQUIRES_REVIEW",
      remarks:        `${chunkResults.filter(r=>r.ok).length}/${chunkResults.length} chunks OK`,
      fields:         allUnifiedFields,   
      supportingData: [],
      sensitiveData:  [],
      signatures:     { preparedBy:null, checkedBy:null, reviewedBy:null, approvedBy:null, signedDate:null },
      validation: {
        completenessScore: avgScore, allChecksPassed: tFail===0,
        overallVerdict:    tFail>0 ? "DOES_NOT_COMPLY" : "REQUIRES_REVIEW",
        verdictReason:     `${tPass}/${tTests} tests passed`,
        failedItems: [], warnings: [], criticalErrors: [],
      },
    }],
    comparison: { isAvailable:false, entitySummaryTable:[], fieldComparison:[], crossDocumentInsights:[] },
    riskAnalysis: { overallRiskLevel: risk, riskItems: [] },
    sourceCitations: [],
    smartSummary: {
      objective:    `Analysis of ${products[0] ?? "document"}`,
      scope:        `${products.length} product(s), ${batches.length} batch(es)`,
      keyFindings:  [`${tTests} tests found`, `${tPass} passed, ${tFail} failed`, `${allUnifiedFields.length} total rows extracted`],
      riskSummary:  alerts.length===0 ? "No critical issues." : `${alerts.length} alerts found.`,
      actionItems:  tFail>0 ? ["Review failed tests"] : ["Approve for release"],
      overallConclusion: tFail>0 ? "DOES_NOT_COMPLY" : "REQUIRES_REVIEW",
      plainEnglishSummary: `${totalPages}-page document. Products: ${products.join(", ")||"unknown"}. Batches: ${batches.join(", ")||"unknown"}. ${tPass}/${tTests} tests passed. ${allUnifiedFields.length} total data rows extracted. Score: ${avgScore}%.`,
      technicalGlossary: [],
    },
    classificationAndPriority: {
      category:          "Routine Quality Check",
      priorityLevel:     risk==="HIGH"?"High":risk==="MEDIUM"?"Medium":"Low",
      priorityReason:    tFail>0 ? `${tFail} test(s) failed` : "Processed",
      recommendedAction: tFail>0 ? "Flag for Review" : "Approve",
    },
  };
}


async function analyzeDocument({ rawText, pageCount=1, fileType="pdf", originalName="document", customPrompt=null }) {


  if (!rawText || rawText.replace(/\s/g,"").length < 20) {
    const r = { idx:1, parsed: fallback(1, "No text extracted"), tokens:0, ok:false };
    return {
      rawMessage:   "No text",
      structured:   buildFinal([r], null, pageCount),
      model:        process.env.AZURE_OPENAI_DEPLOYMENT,
      tokens:       { total:0 },
      finishReason: "error",
    };
  }

  const textToAnalyse = customPrompt ? `CUSTOM INSTRUCTIONS: ${customPrompt}\n\n${rawText}` : rawText;
  const chunks        = buildChunks(textToAnalyse);
  const { results, totalTokens: ct } = await runPipeline(chunks);
  const { merged, mt }               = chunks.length > 1 ? await mergeChunks(results, pageCount) : { merged:null, mt:0 };

  const okCount = results.filter(r=>r.ok).length;

  return {
    rawMessage:   `Analysed ${results.length} chunks`,
    structured:   buildFinal(results, merged, pageCount),
    chunkResults: results,
    model:        process.env.AZURE_OPENAI_DEPLOYMENT,
    tokens:       { total: ct+mt },
    finishReason: "stop",
  };
}

module.exports = { analyzeDocument, openaiClient };
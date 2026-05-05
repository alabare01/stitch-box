// api/extract-pattern-vision.js
// Vercel serverless function — extracts crochet pattern from images or PDF URL via Claude/Gemini
//
// Also exports runVisionExtraction(...) for direct invocation from the queue worker.
// Image cascade: Claude Haiku primary, Gemini fallback (gated by _providerRouter health).

import { getPreferredProvider } from './_providerRouter.js';

export const config = { maxDuration: 300, api: { bodyParser: { sizeLimit: "10mb" } } };

const fullPrompt = `You are a crochet pattern extraction specialist. You will analyze this pattern using a strict 4-step process. Return ONLY valid JSON with no markdown, no backticks, no explanation.

═══ STEP 1 — STRUCTURE ANALYSIS ═══
Before extracting anything, silently determine:
• Is this pattern round-based (worked in the round) or row-based (worked flat)? Or mixed per component?
• Does it contain an abbreviations table, legend, or definition section?
• Are there cross-references like "Repeat R32", "work same as Round 5", or "work into ch3 on R9"?
• Are there branching instructions by size, color variation, or optional sections?
• How many distinct components exist (e.g. body, head, arms, border)?
Use these answers to guide the remaining steps. Do not output this analysis — it is internal context only.

═══ STEP 2 — ABBREVIATIONS FIRST ═══
Extract the COMPLETE abbreviations map from any table, legend, glossary, or definition section BEFORE touching pattern instructions.
• Populate abbreviations_map as a flat key-value object: {"mr":"magic ring","sc":"single crochet","inc":"increase","dec":"invisible decrease","fpdc":"front post double crochet"}
• Include EVERY abbreviation defined in the pattern, even uncommon ones
• If the pattern defines no abbreviations, use standard crochet abbreviations found in the instructions: sc, dc, hdc, tr, sl st, ch, inc, dec, mr, fo, blo, flo, yo, pm, sm, sc2tog
• This map is your reference for all subsequent extraction — use it to interpret shorthand in round/row instructions

═══ STEP 3 — ROUND/ROW EXTRACTION ═══
Extract every round or row as its own entry. Apply these rules strictly:

LABEL PREFIX: Use 'RND' for rounds (worked in the round) or 'ROW' for rows (worked flat). Detect from context which applies per component.

EXPAND RANGES: For any instruction covering multiple rounds like 'RND 10-23: sc in each st (40)' or 'Rows 5-12: repeat Row 4', expand into individual entries: RND 10, RND 11, RND 12... each with the same instruction text. Never leave a range as a single row. Every round the user needs to complete must be its own checkable row.

EXPAND CROSS-REFERENCES INLINE: If a round says "Repeat R32" or "Work same as Round 5", look up what Round 5 / R32 actually says and output the FULL instruction text for that round. Never output "Repeat R32" as a row — always resolve the reference to the actual stitch instructions.

PRESERVE BRACKET NOTATION: Keep bracket/parenthetical repeats exactly as written in the pattern. Examples: "(sc, inc) x 6", "[dc5, (ch1, skip 1) x 3] x 10", "*(2 sc, inc)* repeat 6 times". Do not simplify or expand these — the app tracks them as sub-counters.

EXTRACT repeat_brackets: For each row/round, extract bracket repeat patterns into repeat_brackets array. Example: "Round 16: (6 sc, inc) x 2 -- 16 sts" produces repeat_brackets: [{"sequence":"6 sc, inc","count":2}]. Match patterns like (sequence) x N, [sequence] x N, *sequence* repeat N times. If no bracket repeats, set repeat_brackets: [].

OPEN-ENDED REPEATS: For instructions like "repeat rounds X-Y until desired length" or "work even for as many rounds as you want", extract the repeating block ONCE as individual rounds, then add a note in pattern_notes explaining the open-ended nature. Do not generate infinite rounds.

SIZE/COLOR BRANCHING: If the pattern offers multiple sizes or color variations, extract the primary/default version as the main rows. Note all variations (stitch count differences, alternate colors) in pattern_notes.

ACTION ITEMS: For mid-pattern instructions that are not stitch rows (examples: 'Place the eyes now', 'Begin stuffing', 'Change to Color B', 'See page 7 for details') — include these as rows with label 'NOTE' and set action_item: true.

NOTES AND TIPS: Notes, tips, and instructional comments that accompany a specific row should be attached to that row as the 'note' field, NOT created as a separate row entry. A row should look like: {"id":"rnd-5","label":"RND 5","text":"(sc, inc) x 6 (12)","stitch_count":12,"note":"Use a stitch marker here","action_item":false}. Never create a standalone row where the instruction text starts with 'Note:', 'Tip:', or 'Remember:' — instead attach that text as the note field of the adjacent stitch row it refers to.

INLINE TIPS: If a row instruction contains an inline tip, note, or parenthetical explanation that is not part of the stitch counts or stitch abbreviations — extract it and place it in the row's note field instead, cleaning the instruction text to remove it. The instruction text field should contain only the actual stitch sequence and stitch count. Tips, explanations, and clarifications go in the note field. Example: 'RND 5: 2bpdc into next st (tip: work around the post, not through the top) (12)' should become text: '2bpdc into next st (12)', note: 'Work around the post, not through the top'.

NEVER SKIP ROUNDS: Even if consecutive rounds have identical instructions, each must be its own entry. A round that says "sc in each st around (40)" repeated 8 times means 8 separate row entries.

═══ STEP 4 — CONFIDENCE ═══
After extraction, assess quality:
• If fewer than 3 rounds/rows were extracted OR title is missing, set "confidence": "low"
• If all major sections were found and 10+ rounds extracted, set "confidence": "high"
• Otherwise set "confidence": "medium"

═══ OUTPUT FORMAT ═══
Return this exact JSON structure:
{"title":"string","designer":"string","source_url":null,"finished_size":"string","difficulty":"Beginner or Intermediate or Advanced","yarn_weight":"string","hook_size":"string","gauge":"string or null","confidence":"low or medium or high","materials":[{"name":"string","amount":"string","notes":"string"}],"abbreviations":[{"abbr":"string","meaning":"string"}],"abbreviations_map":{"mr":"magic ring","sc":"single crochet"},"suggested_resources":[{"label":"string","url":"string"}],"pattern_notes":"string","components":[{"name":"string","make_count":1,"independent":false,"rows":[{"id":"rnd-1","label":"RND 1","text":"full instruction text with all references resolved","stitch_count":null,"note":null,"action_item":false,"repeat_brackets":[{"sequence":"string","count":2}]}]}],"assembly_notes":"string","image_description":"string"}

COMPONENT RULES:
• For components like 'FLIPPER (MAKE 2)', set make_count: 2. Default 1 if not specified.
• Set independent: true ONLY when the pattern explicitly says a component can be made separately — e.g. "make 2 separately", "work independently". Default false.
• After all construction components, extract assembly/finishing as a final component named 'ASSEMBLY & FINISHING' with label: 'STEP' and action_item: true for all rows.

PATTERN NOTES: Extract as a single string containing all special technique notes, tension guidance, construction tips, size variations, and open-ended repeat instructions.

SUGGESTED RESOURCES: Extract {label, url} objects from any "Tutorials", "Resources", or hyperlink sections. Default to [] if none found.

Be thorough — extract every component, every round, every material. Ensure the JSON is complete and valid. Do not truncate.`;

const simplePrompt = `Extract this crochet pattern. Return ONLY valid JSON, no markdown, no backticks.
{"title":"string","hook_size":"string","yarn_weight":"string","difficulty":"string","designer":"string","materials":[{"name":"string","amount":"string"}],"components":[{"name":"Main","make_count":1,"independent":false,"rows":[{"id":"row-1","label":"ROW 1","text":"instruction text","stitch_count":null,"action_item":false,"repeat_brackets":[]}]}],"pattern_notes":"string","assembly_notes":"string","confidence":"low"}
Extract every row/round as its own entry. Keep instruction text exactly as written. Do not truncate.`;

const parseGeminiJson = (text) => {
  const cleaned = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n?/i, "").replace(/\n?\s*```[\s\S]*$/, "").trim();
  const toParse = cleaned.startsWith("{") || cleaned.startsWith("[") ? cleaned : text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(toParse);
};

// ─── Provider call helpers (top-level, take keys as params) ──────────────────

async function callGeminiVision({ parts, geminiKey, maxTokens }) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );
  if (!r.ok) {
    const errBody = await r.text();
    throw new Error(`Gemini API error ${r.status}: ${errBody.substring(0, 300)}`);
  }
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    const finishReason = data.candidates?.[0]?.finishReason || "unknown";
    throw new Error("Gemini returned empty response, finishReason: " + finishReason);
  }
  try { return parseGeminiJson(text); } catch (parseErr) {
    throw new Error("Gemini JSON parse failed: " + parseErr.message);
  }
}

async function callClaudeVision({ imageContents, prompt, anthropicKey }) {
  if (!anthropicKey) throw new Error("Anthropic API key not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 32768,
        messages: [{ role: "user", content: [...imageContents, { type: "text", text: prompt }] }],
      }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    if (fetchErr.name === "AbortError") throw new Error("Claude timeout after 240s");
    throw fetchErr;
  }
  clearTimeout(timeout);
  if (!r.ok) {
    const errBody = await r.text();
    throw new Error(`Claude API error ${r.status}: ${errBody.substring(0, 300)}`);
  }
  const data = await r.json();
  const raw = data.content?.[0]?.text || "";
  if (!raw) throw new Error("Claude returned empty response");
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); }
      catch { throw new Error("Claude returned unparseable JSON: " + cleaned.substring(0, 200)); }
    }
    throw new Error("Claude returned no JSON object: " + cleaned.substring(0, 200));
  }
}

// Upload an image (base64 string, optionally data: prefixed) to Gemini Files API.
// Returns { uri, mimeType }.
async function uploadImageToGemini({ base64Data, fileName, index, geminiKey }) {
  const raw = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const binaryBuffer = Buffer.from(raw, "base64");

  let mimeType = "image/jpeg";
  if (base64Data.startsWith("data:")) {
    const match = base64Data.match(/^data:(image\/[^;]+);/);
    if (match) mimeType = match[1];
  }

  const boundary = "----GeminiUpload" + Date.now() + (index ?? 0);
  const metadataPart = JSON.stringify({ file: { mimeType, displayName: fileName || `image-${(index ?? 0) + 1}` } });

  const bodyParts = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    metadataPart,
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${mimeType}\r\n\r\n`,
  ];

  const textEncoder = new TextEncoder();
  const prefix = textEncoder.encode(bodyParts.join(""));
  const suffix = textEncoder.encode(`\r\n--${boundary}--\r\n`);

  const fullBody = new Uint8Array(prefix.length + binaryBuffer.length + suffix.length);
  fullBody.set(prefix, 0);
  fullBody.set(new Uint8Array(binaryBuffer), prefix.length);
  fullBody.set(suffix, prefix.length + binaryBuffer.length);

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: fullBody }
  );
  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Gemini file upload failed: ${uploadRes.status} ${errBody.substring(0, 300)}`);
  }
  const uploadData = await uploadRes.json();
  const uri = uploadData.file?.uri;
  if (!uri) throw new Error("Gemini upload returned no file URI");
  return { uri, mimeType };
}

// ─── EXPORTED: runVisionExtraction (images path) ─────────────────────────────
// Worker contract: array of base64 strings (data: prefix optional). Returns
// { data, extractionMethod, durationMs } where extractionMethod is
// 'image-vision-haiku' or 'image-vision-gemini'. Throws on full failure.

export async function runVisionExtraction({ images, pageCount, fileName, geminiKey, anthropicKey }) {
  if (!Array.isArray(images) || images.length === 0) throw new Error("images array required");
  if (!geminiKey) throw new Error("Gemini API key not configured");

  const t0 = Date.now();

  // Build Claude image-content array up front (cheap, in-memory).
  const claudeImageContents = images.map(base64Data => {
    const raw = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    let mimeType = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:(image\/[^;]+);/);
      if (match) mimeType = match[1];
    }
    return { type: "image", source: { type: "base64", media_type: mimeType, data: raw } };
  });

  // Attempt 1: Claude Haiku (primary)
  try {
    const data = await callClaudeVision({ imageContents: claudeImageContents, prompt: fullPrompt, anthropicKey });
    return { data, extractionMethod: 'image-vision-haiku', durationMs: Date.now() - t0 };
  } catch (claudeErr) {
    console.error("[runVisionExtraction] Claude failed:", claudeErr.message);
  }

  // Attempt 2: Gemini fallback — gated by provider router
  const preferredProvider = await getPreferredProvider(geminiKey);
  if (preferredProvider !== 'gemini') {
    throw new Error("Vision extraction failed: Claude failed and Gemini health probe degraded");
  }

  // Upload images to Gemini Files API for the fallback attempt.
  let fileUris;
  try {
    fileUris = await Promise.all(
      images.map((base64Data, i) => uploadImageToGemini({ base64Data, fileName, index: i, geminiKey }))
    );
  } catch (uploadErr) {
    throw new Error("Vision extraction failed: Claude failed and Gemini upload failed: " + uploadErr.message);
  }

  const buildParts = (prompt) => [
    ...fileUris.map(f => ({ file_data: { mime_type: f.mimeType, file_uri: f.uri } })),
    { text: prompt },
  ];

  try {
    const data = await callGeminiVision({ parts: buildParts(fullPrompt), geminiKey, maxTokens: 65536 });
    return { data, extractionMethod: 'image-vision-gemini', durationMs: Date.now() - t0 };
  } catch (e) {
    console.error("[runVisionExtraction] Gemini full prompt failed:", e.message);
  }

  // Last try: simplified prompt
  try {
    const data = await callGeminiVision({ parts: buildParts(simplePrompt), geminiKey, maxTokens: 32768 });
    return { data, extractionMethod: 'image-vision-gemini', durationMs: Date.now() - t0 };
  } catch (e2) {
    throw new Error("Vision extraction failed after all attempts: " + e2.message);
  }
}

// ─── EXPORTED: runVisionPdfExtraction (pdfUrl path, used by handler only) ───

export async function runVisionPdfExtraction({ pdfUrl, fileName, geminiKey, anthropicKey }) {
  if (!pdfUrl) throw new Error("pdfUrl required");
  if (!geminiKey) throw new Error("Gemini API key not configured");

  const t0 = Date.now();
  let pdfResponse;
  try { pdfResponse = await fetch(pdfUrl); } catch (fetchErr) {
    throw new Error("PDF fetch network error: " + fetchErr.message);
  }
  if (!pdfResponse.ok) throw new Error(`PDF fetch HTTP error: ${pdfResponse.status}`);
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

  // Attempt 1: Claude Haiku
  try {
    const data = await callClaudeVision({
      imageContents: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } }],
      prompt: fullPrompt,
      anthropicKey,
    });
    return { data, extractionMethod: 'pdf-vision-haiku', providerUsed: 'claude', durationMs: Date.now() - t0 };
  } catch (claudeErr) {
    console.error("[runVisionPdfExtraction] Claude failed:", claudeErr.message);
  }

  // Attempt 2: Gemini
  const preferredProvider = await getPreferredProvider(geminiKey);
  if (preferredProvider !== 'gemini') {
    throw new Error("Vision PDF extraction failed: Claude failed and Gemini health probe degraded");
  }

  const buildParts = (prompt) => [
    { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
    { text: prompt },
  ];

  try {
    const data = await callGeminiVision({ parts: buildParts(fullPrompt), geminiKey, maxTokens: 65536 });
    return { data, extractionMethod: 'pdf-vision-gemini', providerUsed: 'gemini', durationMs: Date.now() - t0 };
  } catch (e) {
    console.error("[runVisionPdfExtraction] Gemini full prompt failed:", e.message);
  }

  try {
    const data = await callGeminiVision({ parts: buildParts(simplePrompt), geminiKey, maxTokens: 32768 });
    return { data, extractionMethod: 'pdf-vision-gemini', providerUsed: 'gemini', durationMs: Date.now() - t0 };
  } catch (e2) {
    throw new Error("Vision PDF extraction failed after all attempts: " + e2.message);
  }
}

// ─── HTTP handler (existing surface; thin wrapper) ───────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const _url = process.env.VITE_SUPABASE_URL;
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const _t0 = Date.now();

  try {
    const { images, pageCount, fileName, pdfUrl, filename } = req.body || {};
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured on server" });

    // PDF URL path
    if (pdfUrl) {
      const pdfFileName = filename || fileName || "pattern.pdf";
      const { data, providerUsed } = await runVisionPdfExtraction({
        pdfUrl, fileName: pdfFileName, geminiKey: GEMINI_KEY, anthropicKey: ANTHROPIC_KEY,
      });
      if (_url && _key) {
        await fetch(`${_url}/rest/v1/vercel_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern-vision → 200 pdf-url ${providerUsed} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern-vision', request_method: 'POST', status_code: 200, project_id: 'wovely' })
        }).catch(() => {});
      }
      return res.status(200).json({ ...data, provider: providerUsed });
    }

    // Images array path
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "images array or pdfUrl required" });
    }
    const { data, extractionMethod } = await runVisionExtraction({
      images, pageCount, fileName, geminiKey: GEMINI_KEY, anthropicKey: ANTHROPIC_KEY,
    });
    const providerUsed = extractionMethod === 'image-vision-haiku' ? 'claude' : 'gemini';
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern-vision → 200 images ${providerUsed} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern-vision', request_method: 'POST', status_code: 200, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(200).json({ ...data, provider: providerUsed });
  } catch (err) {
    console.error("[extract-pattern-vision] handler error:", err.message, err.stack);
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[extract-pattern-vision] ${err.message} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern-vision', request_method: 'POST', status_code: 500, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
}

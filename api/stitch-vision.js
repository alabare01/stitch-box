// api/stitch-vision.js
// Library-grounded Stitch-O-Vision identification.
// Vision model picks from a constrained list of stitch_library names. No free
// generation reaches users. Unmatched scans become candidate rows for review.

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "10mb" } } };

import sharp from "sharp";

process.on("unhandledRejection", (reason) => {
  console.error("[STITCH-FULL-ERROR] Unhandled rejection:", reason);
  if (reason instanceof Error) console.error("[STITCH-FULL-ERROR] Stack:", reason.stack);
});
process.on("uncaughtException", (err) => {
  console.error("[STITCH-FULL-ERROR] Uncaught exception:", err);
  console.error("[STITCH-FULL-ERROR] Stack:", err.stack);
});

const NEEDS_CONVERSION = new Set([
  "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence",
  "image/avif", "image/tiff", "image/bmp", "image/x-ms-bmp",
]);

const POSTHOG_KEY = process.env.POSTHOG_PROJECT_KEY || "phc_CgK3ydJGk6XRtRPLQ8cnXxkqSroQBsuYrV9VsWk2r76Y";
const POSTHOG_HOST = "https://us.i.posthog.com";

// Module-level library cache. Vercel keeps the function instance warm between
// invocations, so this dramatically reduces Supabase round-trips. Cold start
// re-fetches automatically.
const LIBRARY_TTL_MS = 5 * 60 * 1000;
let libraryCache = null; // { fetchedAt, stitches, lookup }

function normalize(s) {
  if (!s) return "";
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

async function fetchLibrary(supaUrl, supaKey) {
  if (libraryCache && Date.now() - libraryCache.fetchedAt < LIBRARY_TTL_MS) {
    return libraryCache;
  }
  console.log("[SOV-LIBRARY] Fetching stitch_library names + visual cues + descriptions");
  const res = await fetch(
    `${supaUrl}/rest/v1/stitch_library?select=slug,primary_name,also_known_as,visual_cues,description&limit=1000`,
    { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` } }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`stitch_library fetch failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const rows = await res.json();
  // Build a normalized lookup: any primary_name OR also_known_as -> slug
  const lookup = new Map();
  for (const r of rows) {
    lookup.set(normalize(r.primary_name), r.slug);
    if (Array.isArray(r.also_known_as)) {
      for (const aka of r.also_known_as) {
        const k = normalize(aka);
        if (k && !lookup.has(k)) lookup.set(k, r.slug);
      }
    }
  }
  libraryCache = { fetchedAt: Date.now(), stitches: rows, lookup };
  console.log(`[SOV-LIBRARY] Cached ${rows.length} stitches, ${lookup.size} normalized lookup keys`);
  return libraryCache;
}

// First sentence of a description, capped at 160 chars. Strips paragraph breaks.
function firstSentence(s) {
  if (!s) return "";
  const para = String(s).trim().split(/\n+/)[0];
  if (!para) return "";
  const m = para.match(/^.+?[.!?](?=\s|$)/);
  const sent = m ? m[0] : para;
  return sent.length <= 160 ? sent : sent.slice(0, 160).trimEnd() + "…";
}

function formatStitchEntry(s) {
  const vc = Array.isArray(s.visual_cues) && s.visual_cues.length > 0
    ? s.visual_cues.join(", ")
    : "";
  const desc = firstSentence(s.description || "");
  let line = s.primary_name;
  if (vc && desc) line += `: ${vc} — ${desc}`;
  else if (vc)    line += `: ${vc}`;
  else if (desc)  line += ` — ${desc}`;
  return line;
}

function buildPrompt(stitches) {
  const list = stitches.map(formatStitchEntry).join("\n");
  return `You are looking at a photo of a crochet swatch. Each stitch below has its name followed by visual cues describing its appearance, and a short description. Match the image to a stitch ONLY if multiple visual cues clearly correspond to what you see in the image. If the image shows features that don't clearly match any stitch's visual cues, respond UNSURE.

You MUST respond with EXACTLY one of these stitch names (verbatim, including capitalization), OR the literal word UNSURE if you cannot confidently match the image to any of these stitches.

Respond with UNSURE if the image shows a printed pattern page, a stitch chart or symbol diagram, knitting instead of crochet, a finished object too far away to see individual stitches, or anything that does not clearly show crocheted fabric matching one of the listed stitches. Do NOT guess. Picking the wrong stitch is worse than admitting uncertainty.

Confidence guidelines:
- HIGH: Image clearly shows multiple distinguishing features that match this stitch's visual cues. You could point to specific features and explain why this stitch is the answer.
- MEDIUM: Some features match the visual cues but there is ambiguity, OR the image quality limits certainty.
- LOW: Image shows visual similarity to this stitch but you have meaningful doubt. Strongly consider UNSURE instead.

When in doubt, prefer UNSURE over a LOW-confidence pick. UNSURE is the correct answer when no stitch's visual cues clearly match what you see.

Available stitches:
${list}

Respond with ONLY this JSON shape, no markdown fences, no preamble:
{
  "identification": "<exact stitch name from the list, OR 'UNSURE'>",
  "confidence": "<HIGH|MEDIUM|LOW>",
  "reasoning": "<one short sentence explaining the choice>"
}`;
}

function tryParseJson(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```[\w]*\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  if (!t.startsWith("{")) {
    const m = t.match(/\{[\s\S]*\}/);
    t = m ? m[0] : t;
  }
  t = t.replace(/,\s*([\]}])/g, "$1").trim();
  try { return JSON.parse(t); } catch { return null; }
}

async function callClaude(imgBase64, mimeType, prompt, anthropicKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mimeType, data: imgBase64 } },
        { type: "text", text: prompt },
      ] }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[SOV-CLAUDE] non-ok:", res.status, body.slice(0, 300));
    return null;
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return tryParseJson(text);
}

async function callGemini(imgBase64, mimeType, prompt, geminiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: imgBase64 } },
          { text: prompt },
        ] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[SOV-GEMINI] non-ok:", res.status, body.slice(0, 300));
    return null;
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  let text = "";
  for (const p of parts) { if (!p.thought && p.text) { text = p.text; break; } }
  if (!text && parts.length > 0) text = parts[parts.length - 1]?.text || "";
  return tryParseJson(text);
}

async function fetchLibraryRow(supaUrl, supaKey, slug) {
  const res = await fetch(`${supaUrl}/rest/v1/stitch_library?slug=eq.${encodeURIComponent(slug)}&limit=1`, {
    headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

async function insertCandidate(supaUrl, supaKey, row) {
  const res = await fetch(`${supaUrl}/rest/v1/stitch_library_candidates`, {
    method: "POST",
    headers: {
      apikey: supaKey,
      Authorization: `Bearer ${supaKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[SOV-CANDIDATE] insert failed:", res.status, body.slice(0, 300));
    return false;
  }
  return true;
}

async function postHog(eventName, distinctId, properties) {
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: eventName,
        distinct_id: distinctId || `anon-server-${Date.now()}`,
        properties: { ...(properties || {}), $lib: "wovely-server", source: "stitch-vision" },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("[SOV-POSTHOG]", eventName, "fire failed:", err.message);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supaUrl = process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supaUrl || !supaKey) {
    console.error("[SOV] Missing Supabase env vars");
    return res.status(500).json({ error: true, message: "Server not configured" });
  }
  if (!anthropicKey && !geminiKey) {
    console.error("[SOV] Missing both ANTHROPIC_API_KEY and GEMINI_API_KEY");
    return res.status(500).json({ error: true, message: "Server not configured" });
  }

  // Parse body — accept both image_url (snake) and imageUrl (camel)
  const body = req.body || {};
  const imageUrl = body.image_url || body.imageUrl;
  const userId = body.user_id || body.userId || null;
  if (!imageUrl) return res.status(400).json({ error: "image_url required" });

  const distinctId = userId || `anon-${Math.random().toString(36).slice(2, 10)}`;

  await postHog("sov_scan_started", distinctId, { user_id: userId, has_user: !!userId });

  // Fetch + normalize image
  let imgBuffer, mimeType;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      await postHog("sov_scan_failed", distinctId, { error_type: "image_fetch_non_ok", status: imgRes.status });
      return res.status(200).json({ error: true, message: "Could not load the uploaded image. Please try again." });
    }
    imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    mimeType = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
  } catch (err) {
    console.error("[SOV] image fetch failed:", err.message);
    await postHog("sov_scan_failed", distinctId, { error_type: "image_fetch_exception" });
    return res.status(200).json({ error: true, message: "Could not load the uploaded image. Please try again." });
  }

  try {
    if (NEEDS_CONVERSION.has(mimeType) || !mimeType.startsWith("image/")) {
      imgBuffer = await sharp(imgBuffer).jpeg({ quality: 85 }).toBuffer();
      mimeType = "image/jpeg";
    }
    if (imgBuffer.byteLength > 4 * 1024 * 1024) {
      imgBuffer = await sharp(imgBuffer)
        .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      mimeType = "image/jpeg";
    }
  } catch (err) {
    console.error("[SOV] sharp processing failed:", err.message);
    await postHog("sov_scan_failed", distinctId, { error_type: "image_processing" });
    return res.status(200).json({ error: true, message: "Could not process this image. Try a different photo." });
  }

  // Fetch library + build prompt
  let library;
  try {
    library = await fetchLibrary(supaUrl, supaKey);
  } catch (err) {
    console.error("[SOV] library fetch failed:", err.message);
    await postHog("sov_scan_failed", distinctId, { error_type: "library_fetch" });
    return res.status(500).json({ error: true, message: "Server not configured" });
  }
  const prompt = buildPrompt(library.stitches);
  const imgBase64 = imgBuffer.toString("base64");

  // Vision call: Claude primary, Gemini fallback
  let parsed = null;
  if (anthropicKey) {
    try { parsed = await callClaude(imgBase64, mimeType, prompt, anthropicKey); }
    catch (err) { console.error("[SOV] Claude exception:", err.message); }
  }
  if (!parsed && geminiKey) {
    try { parsed = await callGemini(imgBase64, mimeType, prompt, geminiKey); }
    catch (err) { console.error("[SOV] Gemini exception:", err.message); }
  }

  if (!parsed || typeof parsed.identification !== "string") {
    console.error("[SOV] Both vision models failed or returned unparseable JSON");
    await postHog("sov_scan_failed", distinctId, { error_type: "vision_unparseable" });
    return res.status(200).json({ error: true, message: "Something went wrong on my end. Try again in a moment?" });
  }

  const identificationRaw = parsed.identification.trim();
  const confidenceRaw = String(parsed.confidence || "").toLowerCase();
  const confidence = ["high", "medium", "low"].includes(confidenceRaw) ? confidenceRaw : "low";

  console.log(`[SOV] model said: identification="${identificationRaw}" confidence=${confidence}`);

  // UNSURE path → no match, save candidate
  if (identificationRaw.toUpperCase() === "UNSURE") {
    await insertCandidate(supaUrl, supaKey, {
      user_id: userId,
      image_url: imageUrl,
      vision_model_guess: "UNSURE",
      vision_model_confidence: confidence,
      library_attempted_match: null,
      match_failed_reason: "unsure",
    });
    await postHog("sov_scan_no_match", distinctId, { vision_model_guess: "UNSURE", match_failed_reason: "unsure" });
    return res.status(200).json({ matched: false });
  }

  // Try to match identification against library
  const slug = library.lookup.get(normalize(identificationRaw));

  // Lookup miss (model said something not in our list)
  if (!slug) {
    await insertCandidate(supaUrl, supaKey, {
      user_id: userId,
      image_url: imageUrl,
      vision_model_guess: identificationRaw,
      vision_model_confidence: confidence,
      library_attempted_match: null,
      match_failed_reason: "lookup_miss",
    });
    await postHog("sov_scan_no_match", distinctId, { vision_model_guess: identificationRaw, match_failed_reason: "lookup_miss" });
    return res.status(200).json({ matched: false });
  }

  // Low confidence → treat as no match, save candidate with the slug we almost matched
  if (confidence === "low") {
    await insertCandidate(supaUrl, supaKey, {
      user_id: userId,
      image_url: imageUrl,
      vision_model_guess: identificationRaw,
      vision_model_confidence: "low",
      library_attempted_match: slug,
      match_failed_reason: "low_confidence",
    });
    await postHog("sov_scan_no_match", distinctId, { vision_model_guess: identificationRaw, match_failed_reason: "low_confidence" });
    return res.status(200).json({ matched: false });
  }

  // Matched: fetch the full row and return it
  const stitch = await fetchLibraryRow(supaUrl, supaKey, slug);
  if (!stitch) {
    // Shouldn't happen — slug was in our cache but row not found. Treat as lookup miss.
    await insertCandidate(supaUrl, supaKey, {
      user_id: userId,
      image_url: imageUrl,
      vision_model_guess: identificationRaw,
      vision_model_confidence: confidence,
      library_attempted_match: slug,
      match_failed_reason: "lookup_miss",
    });
    await postHog("sov_scan_no_match", distinctId, { vision_model_guess: identificationRaw, match_failed_reason: "lookup_miss" });
    return res.status(200).json({ matched: false });
  }

  await postHog("sov_scan_matched", distinctId, { matched_slug: slug, confidence });
  return res.status(200).json({ matched: true, stitch, confidence });
}

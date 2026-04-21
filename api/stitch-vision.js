// api/stitch-vision.js
// Vercel serverless function — identifies crochet stitch from a photo via Gemini

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "10mb" } } };

import sharp from "sharp";

// Global error catchers — log full details for any unhandled errors in this function
process.on("unhandledRejection", (reason) => {
  console.error("[STITCH-FULL-ERROR] Unhandled rejection:", reason);
  if (reason instanceof Error) console.error("[STITCH-FULL-ERROR] Stack:", reason.stack);
});
process.on("uncaughtException", (err) => {
  console.error("[STITCH-FULL-ERROR] Uncaught exception:", err);
  console.error("[STITCH-FULL-ERROR] Stack:", err.stack);
});

const PROMPT = `You are a crochet stitch identification expert. You think like an experienced crocheter who has made thousands of projects and can identify any stitch by looking at the fabric.

Analyze this image and identify what you see. Focus exclusively on the textile itself — ignore yarn color, yarn weight, hands, hooks, and needles that may appear in the foreground. There will always be enough fabric visible to make an identification.

═══ CORE PRINCIPLE ═══
Crochet identification has THREE INDEPENDENT DIMENSIONS. Do not conflate them.

1. STITCH TECHNIQUE — the actual hook motion creating each loop (sc, hdc, dc, tr, linen stitch, shell stitch, bobble, etc.)
2. PATTERN ARRANGEMENT — the visual arrangement if present (chevron/ripple, stripes, colorwork blocks, zigzag)
3. CONSTRUCTION METHOD — how the overall piece is built (granny square motifs, corner-to-corner, amigurumi, tunisian, filet, tapestry, intarsia)

All three can be present independently. A granny square blanket has a granny CONSTRUCTION with a double crochet cluster STITCH joined into motifs. A chevron linen blanket has a linen stitch TECHNIQUE arranged in a chevron ARRANGEMENT worked in rows.

═══ HOW TO IDENTIFY — A CROCHETER'S DECISION TREE ═══
Follow this order. Do not skip steps.

STEP 1 — IDENTIFY THE BASE STITCH by height and shape:
- Single crochet (sc): short, roughly as wide as tall. Densest fabric.
- Half double crochet (hdc): medium height, taller than sc, shorter than dc. Has a distinctive three-loop top.
- Double crochet (dc): looks like a K shape — an upside-down V at the bottom (woven through previous row space) and a V at the top (woven around the front loop). Roughly twice the height of sc.
- Treble crochet (tr): tall and elongated, roughly 3x the height of sc.
- Chain (ch): a flat horizontal dash or bump, used between stitches or as turning chains.

STEP 2 — IDENTIFY PLACEMENT (where the next stitch was worked):
- Standard (top of previous stitch): stitches stack directly, no visible ridges.
- Back Loop Only (BLO): a visible horizontal ridge of unworked front loops runs across the fabric surface.
- Front Loop Only (FLO): same ridge effect but on the opposite face.
- Front Post (FP): the tops of the stitches appear ROTATED SIDEWAYS — instead of seeing the V on top of each stitch, you see the side of it. The top loops become visible horizontally. Creates a raised, ropey texture.
- Back Post (BP): same rotation principle but pushed backward, creating an inset texture.
- Chain space: stitches are visibly worked between the previous row's stitches, not on top — creates offset/brick-like structures.

STEP 3 — IDENTIFY INCREASES AND DECREASES:
- Regular peaks (multiple stitches in one stitch) + regular valleys (stitches worked together) at consistent intervals across each row = chevron/ripple arrangement.
- Rounded peaks every few stitches without valleys = scallop/shell arrangement.
- Increases at ends of rows only = triangular/diagonal growth (possibly C2C).
- Increases every round at consistent points = amigurumi sculptural shaping.

STEP 4 — CHECK FOR INTERLOCKING STRUCTURES (critical — these fool beginners):
- LINEN / MOSS / WOVEN / GRANITE STITCH: look for horizontal dashes between stitches. Each V sits on a visible horizontal dash — that dash is the chain space. Stitches are SHORT (not taller than wide), and the fabric has a brick-like offset pattern because each row's sc works into the previous row's ch-1 space. If you see this, the base stitch is single crochet + chain, NOT double crochet, regardless of how "tall" the visual Vs might appear.
- V-STITCH PATTERN: two dc's share a base stitch, creating visible V shapes with space between them.
- SHELL STITCH: multiple dc's worked into one stitch, fanning outward.
- BOBBLE / POPCORN / PUFF: clusters that pop off the fabric surface, creating 3D bumps.

STEP 5 — SANITY CHECK (mandatory before answering):
- Count the visible rows. If you said "double crochet worked in rows," does the row count match what you'd expect for the fabric height shown?
- If you said "linen stitch," can you see the horizontal dashes between stitches? If not, reconsider.
- If you said "chevron," can you see regular peaks and valleys? Is your base_stitch call consistent with the stitch height in the image?
- Does your description contradict your primary_identifier? If so, reconsider.

═══ THREE SCENARIOS ═══

SCENARIO A — Fabric is visible, identify the stitch:
The image shows actual crochet fabric. Follow the 5-step decision tree. Populate stitch_technique (and pattern_arrangement if present, and construction_method if present).

SCENARIO B — Distinct construction method is the defining feature:
The image shows a project where the defining element is the construction method (granny square motifs joined together, clear C2C diagonal growth, obvious amigurumi 3D shape, tunisian's distinctive surface and hook style, filet's grid design, tapestry colorwork with carried yarns, intarsia with separate color blocks). Populate construction_method AND attempt to identify the underlying stitch_technique. If the base stitch is not clearly determinable at the photo distance, set stitch_technique to null and note this in confidence_reasoning.

SCENARIO C — Printed pattern, chart, or instructional page (NOT fabric):
The image is primarily text, diagrams, pattern instructions, a PDF or printed page, a screenshot of pattern text, a magazine page, or a stitch chart. Even if the printed page mentions a stitch name, do NOT attempt to identify — it's not fabric.
Return:
  "not_stitch": true
  "content_type": "printed_pattern"
  "stitch_technique": null
  "pattern_arrangement": null
  "construction_method": null
  "primary_identifier": null
  "stitch_name": null
  "description": brief explanation of what you see (e.g. "Printed crochet pattern page with written instructions")
Leave other fields empty or null.

═══ RULES ═══
- Be specific. "Single crochet" beats "basic stitch." "Moss stitch" beats "textured stitch."
- NEVER conflate dimensions. Chevron is an ARRANGEMENT, not a stitch. Granny Square is a CONSTRUCTION, not a stitch. Amigurumi is a CONSTRUCTION, not a stitch.
- If you cannot confidently determine the base stitch from the image (e.g. too zoomed out, stitch interlocking hides the detail), set stitch_technique to null and explain in confidence_reasoning. Honesty beats a confident wrong answer.
- Confidence levels reflect how certain you are of primary_identifier:
  - HIGH: visible detail clearly supports your identification, decision tree completed without ambiguity.
  - MEDIUM: strong visual evidence supports the identification but one or more details are ambiguous (e.g. stitch height could be sc or hdc).
  - LOW: image is too unclear, too zoomed out, or genuinely ambiguous. Still provide your best guess with honest reasoning.
- ALWAYS populate description, common_uses, tutorial_search, difficulty, and also_known_as regardless of confidence.
- For also_known_as, include regional name variations (US vs UK), interchangeable names (e.g. Linen = Moss = Woven = Granite), and common alternate names.
- If a crochet hook, knitting needle, or hands are visible alongside any fabric, this is a crochet work-in-progress — NEVER return not_crochet: true in this case. Attempt identification with appropriate confidence.
- Only set not_crochet to true if this is definitively not a crochet item AND no yarn or fabric is visible at all.

═══ OUTPUT ═══
Return ONLY a valid JSON object with no markdown, no backticks, no explanation before or after:

{
  "stitch_technique": "specific stitch (e.g. 'Linen Stitch', 'Double Crochet', 'Shell Stitch') or null if not determinable",
  "pattern_arrangement": "visual arrangement if present (e.g. 'Chevron/Ripple', 'Stripes', 'Colorwork blocks') or null if none",
  "construction_method": "construction technique if distinctive (e.g. 'Granny Square', 'Corner-to-Corner', 'Amigurumi', 'Tunisian', 'Filet', 'Tapestry', 'Intarsia') or null if none",
  "primary_identifier": "the one-line answer the user sees first. Usually the stitch_technique. If arrangement or construction is present, combine them naturally (e.g. 'Linen Stitch in a Chevron arrangement', 'Double Crochet Granny Square', 'Amigurumi worked in Single Crochet').",
  "stitch_name": "SAME VALUE AS primary_identifier — kept for backward compatibility",
  "base_stitch": "the underlying stitch if primary_identifier is a construction or arrangement (e.g. 'Single Crochet + Chain' for linen stitch, 'Double Crochet' for granny square). SAME VALUE AS stitch_technique when populated. Kept for backward compatibility.",
  "confidence": "high | medium | low",
  "confidence_reasoning": "1-2 sentences explaining what visual evidence supports your identification and what (if anything) is ambiguous. Reference specific visual cues you used (stitch height, chain space dashes, post rotations, etc).",
  "also_known_as": ["alternate names, regional variations, interchangeable names — empty array if none"],
  "difficulty": "Beginner | Intermediate | Advanced",
  "description": "2-3 sentences describing what makes this stitch/arrangement/construction distinctive, how it is worked, and what the texture looks like. NEVER empty.",
  "common_uses": "what this is typically used for. NEVER empty.",
  "tutorial_search": "best YouTube search term for a tutorial on this exact technique",
  "not_crochet": false,
  "not_stitch": false,
  "content_type": "fabric | printed_pattern"
}`;

const NEEDS_CONVERSION = new Set([
  "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence",
  "image/avif", "image/tiff", "image/bmp", "image/x-ms-bmp",
]);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const _url = process.env.VITE_SUPABASE_URL;
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const _t0 = Date.now();

  // ── STEP 1: Parse request body ──
  console.log("[STITCH-STEP-1] Parsing request body");
  let imageUrl;
  try {
    const body = req.body || {};
    imageUrl = body.imageUrl;
    console.log("[STITCH-STEP-1] imageUrl:", imageUrl ? imageUrl.substring(0, 120) + "..." : "MISSING");
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });
  } catch (err) {
    console.error("[STITCH-STEP-1] FAILED — body parse error:", err);
    console.error("[STITCH-STEP-1] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Invalid request. Please try again." });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.error("[STITCH-STEP-1] GEMINI_API_KEY not configured");
    return res.status(500).json({ error: "API key not configured" });
  }

  // ── STEP 2: Fetch image from storage URL ──
  console.log("[STITCH-STEP-2] Fetching image from:", imageUrl);
  let imgBuffer, mimeType, fileName;
  try {
    const imgRes = await fetch(imageUrl);
    console.log("[STITCH-STEP-2] Fetch response — status:", imgRes.status, "content-type:", imgRes.headers.get("content-type"), "content-length:", imgRes.headers.get("content-length"));

    if (!imgRes.ok) {
      let respBody = "";
      try { respBody = await imgRes.text(); } catch {}
      console.error("[STITCH-STEP-2] FAILED — non-ok status:", imgRes.status, "body:", respBody.substring(0, 500));
      return res.status(200).json({ error: true, message: "Could not load the uploaded image. Please try again." });
    }

    imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    mimeType = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
    fileName = "unknown";
    try { fileName = new URL(imageUrl).pathname.split("/").pop() || "unknown"; } catch {}

    console.log("[STITCH-STEP-2] Success — file:", fileName, "size:", imgBuffer.byteLength, "bytes, mime:", mimeType, "buffer valid:", Buffer.isBuffer(imgBuffer));
  } catch (err) {
    console.error("[STITCH-STEP-2] FAILED — exception during image fetch:", err);
    console.error("[STITCH-STEP-2] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Could not load the uploaded image. Please try again." });
  }

  // ── STEP 3: Sharp conversion/resize ──
  console.log("[STITCH-STEP-3] Processing image — mime:", mimeType, "size:", imgBuffer.byteLength, "needs conversion:", NEEDS_CONVERSION.has(mimeType) || !mimeType.startsWith("image/"));
  try {
    // Normalize non-standard MIME types to JPEG
    if (NEEDS_CONVERSION.has(mimeType) || !mimeType.startsWith("image/")) {
      console.log("[STITCH-STEP-3] Converting", mimeType, "to JPEG via sharp");
      imgBuffer = await sharp(imgBuffer).jpeg({ quality: 85 }).toBuffer();
      mimeType = "image/jpeg";
      console.log("[STITCH-STEP-3] Converted — new size:", imgBuffer.byteLength, "bytes");
    }

    // Resize if over 4MB
    if (imgBuffer.byteLength > 4 * 1024 * 1024) {
      console.log("[STITCH-STEP-3] Resizing — image is", imgBuffer.byteLength, "bytes (over 4MB)");
      imgBuffer = await sharp(imgBuffer)
        .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      mimeType = "image/jpeg";
      console.log("[STITCH-STEP-3] Resized — new size:", imgBuffer.byteLength, "bytes");
    }

    console.log("[STITCH-STEP-3] Success — final size:", imgBuffer.byteLength, "bytes, mime:", mimeType);
  } catch (err) {
    console.error("[STITCH-STEP-3] FAILED — sharp processing error:", err);
    console.error("[STITCH-STEP-3] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Could not process this image. Try taking a screenshot and uploading that instead." });
  }

  // Helper: parse raw text into stitch result
  const parseStitchText = (text, tag) => {
    if (!text) return null;
    let toParse = text.trim();
    toParse = toParse.replace(/^```[\w]*\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    if (!toParse.startsWith("{")) {
      const match = toParse.match(/\{[\s\S]*\}/);
      toParse = match ? match[0] : toParse;
    }
    toParse = toParse.replace(/,\s*([\]}])/g, "$1").trim();
    try {
      return JSON.parse(toParse);
    } catch (parseErr) {
      console.error(`[${tag}] JSON.parse failed, attempting regex extraction. Raw text:`, toParse.substring(0, 500));
      const nameMatch = toParse.match(/"stitch_name"\s*:\s*"([^"]+)"/);
      const diffMatch = toParse.match(/"difficulty"\s*:\s*"([^"]+)"/);
      const descMatch = toParse.match(/"description"\s*:\s*"([^"]+)"/);
      const confMatch = toParse.match(/"confidence"\s*:\s*"([^"]+)"/);
      const usesMatch = toParse.match(/"common_uses"\s*:\s*"([^"]+)"/);
      const tutMatch  = toParse.match(/"tutorial_search"\s*:\s*"([^"]+)"/);
      if (nameMatch) {
        console.log(`[${tag}] Regex extraction succeeded — stitch_name:`, nameMatch[1]);
        return {
          stitch_name: nameMatch[1],
          difficulty: diffMatch?.[1] || "Intermediate",
          description: descMatch?.[1] || "",
          confidence: confMatch?.[1] || "low",
          common_uses: usesMatch?.[1] || "",
          tutorial_search: tutMatch?.[1] || nameMatch[1] + " crochet stitch tutorial",
          also_known_as: [],
          not_crochet: false,
        };
      }
      console.error(`[${tag}] Regex extraction also failed.`);
      return null;
    }
  };

  // ── STEP 4: Call Claude Haiku (primary) ──
  const imgBase64 = imgBuffer.toString("base64");
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  let result;

  if (ANTHROPIC_KEY) {
    console.log("[STITCH-STEP-4] Calling Haiku (primary) — base64 length:", imgBase64.length, "mime:", mimeType);
    try {
      const haikuRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imgBase64 } },
            { type: "text", text: PROMPT },
          ] }],
        }),
      });
      console.log("[STITCH-STEP-4] Haiku response status:", haikuRes.status);
      if (haikuRes.ok) {
        const haikuData = await haikuRes.json();
        const haikuText = haikuData.content?.[0]?.text || "";
        console.log("[STITCH-STEP-4] Haiku text:", haikuText.substring(0, 500));
        if (haikuText) {
          result = parseStitchText(haikuText, "STITCH-STEP-4");
        } else {
          console.error("[STITCH-STEP-4] Empty response from Haiku — will try Gemini fallback");
        }
      } else {
        let haikuErr = "";
        try { haikuErr = await haikuRes.text(); } catch {}
        console.error("[STITCH-STEP-4] Haiku non-ok — status:", haikuRes.status, "body:", haikuErr.substring(0, 500));
        console.log("[STITCH-STEP-4] Haiku failed — trying Gemini fallback");
      }
    } catch (haikuErr) {
      console.error("[STITCH-STEP-4] FAILED — Haiku network error:", haikuErr.message);
      console.error("[STITCH-STEP-4] Stack:", haikuErr.stack);
    }
  } else {
    console.error("[STITCH-STEP-4] ANTHROPIC_API_KEY not configured — skipping Haiku primary, going straight to Gemini");
  }

  // ── STEP 4b: Gemini fallback if Haiku failed or returned no result ──
  if (!result) {
    console.log("[STITCH-STEP-4-GEMINI] Calling Gemini fallback — base64 length:", imgBase64.length, "mime:", mimeType);
    let geminiRes;
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: mimeType, data: imgBase64 } },
              { text: PROMPT },
            ] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
          }),
        }
      );
      console.log("[STITCH-STEP-4-GEMINI] Gemini response — status:", geminiRes.status);
    } catch (err) {
      console.error("[STITCH-STEP-4-GEMINI] FAILED — Gemini network error:", err);
      console.error("[STITCH-STEP-4-GEMINI] Network error:", err.message);
      console.error("[STITCH-STEP-4-GEMINI] Stack:", err.stack);
      geminiRes = null;
    }

    if (!geminiRes || !geminiRes.ok) {
      if (geminiRes) {
        let errBody = "";
        try { errBody = await geminiRes.text(); } catch {}
        console.error("[STITCH-STEP-4-GEMINI] Gemini non-ok — status:", geminiRes.status, "body:", errBody.substring(0, 500));
      }
      return res.status(200).json({ error: true, message: "Stitch identification failed. Please try again with a different photo." });
    }

    console.log("[STITCH-STEP-5] Parsing Gemini response");
    try {
      const data = await geminiRes.json();
      const finishReason = data.candidates?.[0]?.finishReason;
      const parts = data.candidates?.[0]?.content?.parts || [];
      console.log("[STITCH-STEP-5] Parts count:", parts.length, "finish reason:", finishReason);
      let text = "";
      for (const part of parts) {
        const t = part.text || "";
        console.log("[STITCH-STEP-5] Part type:", part.thought ? "thinking" : "output", "length:", t.length, "preview:", t.substring(0, 100));
        if (!part.thought && t.trim().length > 0) { text = t; break; }
      }
      if (!text && parts.length > 0) text = parts[parts.length - 1]?.text || "";
      console.log("[STITCH-STEP-5] Selected text:", text.substring(0, 500));

      if (!text) {
        console.error("[STITCH-STEP-5] Empty text — finishReason:", finishReason, "full response:", JSON.stringify(data).substring(0, 500));
      } else {
        result = parseStitchText(text, "STITCH-STEP-5");
      }
    } catch (err) {
      console.error("[STITCH-STEP-5] FAILED — parse error:", err);
      console.error("[STITCH-STEP-5] Stack:", err.stack);
    }
  }

  if (!result) {
    return res.status(200).json({ error: true, message: "Could not interpret the stitch analysis. Please try a clearer photo." });
  }
  console.log("[STITCH-STEP-5] Success — identified:", result.stitch_name, "confidence:", result.confidence);

  // inline log — direct, no utility dependency
  if (_url && _key) {
    await fetch(`${_url}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': _key,
        'Authorization': `Bearer ${_key}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `POST /api/stitch-vision → 200 (${Date.now() - _t0}ms)`,
        source: 'serverless',
        request_path: '/api/stitch-vision',
        request_method: 'POST',
        status_code: 200,
        project_id: 'wovely'
      })
    }).catch(() => {});
  }

  return res.status(200).json(result);
}


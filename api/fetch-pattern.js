// api/fetch-pattern.js
// Vercel serverless function — fetches a URL and extracts crochet pattern via Gemini

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "URL required" });

  const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured" });

  try {
    // Step 1: Fetch the page HTML
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StitchBox/1.0; pattern importer)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) throw new Error(`Failed to fetch page: ${pageRes.status}`);

    const html = await pageRes.text();

    // Step 2: Strip HTML to clean text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim()
      .slice(0, 12000); // Limit to avoid token overflow

    // Step 3: Pass clean text to Gemini for extraction
    const prompt = `You are a crochet pattern parser. Extract the crochet pattern from the text below and return ONLY valid JSON with no explanation, no markdown, no code blocks. Just the raw JSON object.

Required schema:
{
  "title": "pattern name",
  "source": "domain only e.g. allfreecrochet.com",
  "cat": "Blankets or Wearables or Accessories or Amigurumi or Home Décor or Uncategorized",
  "hook": "hook size e.g. 5.0mm or empty string if not found",
  "weight": "yarn weight e.g. Worsted or empty string if not found",
  "yardage": 0,
  "notes": "brief pattern description",
  "materials": [
    {"id": 1, "name": "material name", "amount": "amount string", "yardage": 0}
  ],
  "rows": [
    {"id": 1, "text": "exact instruction text", "done": false, "note": ""}
  ]
}

Rules:
- Extract EVERY row, round, step, and instruction as a separate rows entry
- Keep row text exactly as written in the pattern
- Include foundation chain, all rounds/rows, assembly, finishing
- If no pattern is found, return {"error": "No pattern found on this page"}

Page text:
${text}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini error: ${geminiRes.status}`);

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.error) return res.status(422).json({ error: parsed.error });

    // Normalize rows
    const rows = (parsed.rows || []).map((r, i) => ({
      id: Date.now() + i,
      text: r.text || "",
      done: false,
      note: "",
    }));

    return res.status(200).json({ ...parsed, rows });

  } catch (err) {
    console.error("fetch-pattern error:", err);
    return res.status(500).json({ error: err.message || "Failed to extract pattern" });
  }
}

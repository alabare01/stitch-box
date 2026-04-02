import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T } from "./theme.jsx";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";

const DIFF_COLORS = { Beginner: "#5C9E7A", Intermediate: "#C9853A", Advanced: "#C05A5A" };

const StitchResultPage = () => {
  const { id: paramId } = useParams();
  const id = paramId || window.location.pathname.split("/stitch/")[1]?.split("/")[0];
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) { setError("Not found"); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/stitch_results?id=eq.${id}&select=*`, {
          headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Not found");
        const rows = await res.json();
        if (!rows.length) throw new Error("Not found");
        setData(rows[0]);
        document.title = `${rows[0].result?.stitch_name || "Stitch"} — Wovely Stitch Vision`;
      } catch (e) { setError(e.message); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <style>{`@keyframes srSpin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 16px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#9B7EC8", animation: "srSpin 1s linear infinite" }} />
          <img src="/bev_neutral.png" alt="Bev" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 32, height: 32, objectFit: "contain" }} />
        </div>
        <div style={{ fontSize: 14, color: "#6B6B8A" }}>Loading result…</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center", padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#2D3A7C", marginBottom: 8 }}>Result not found</div>
        <div style={{ fontSize: 14, color: "#6B6B8A", marginBottom: 24 }}>This link may have expired or the result was removed.</div>
        <a href="/" style={{ background: "#9B7EC8", color: "#fff", borderRadius: 99, padding: "12px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>Go to Wovely</a>
      </div>
    </div>
  );

  const r = data.result;
  const diffColor = DIFF_COLORS[r.difficulty] || "#6B6B8A";

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 120px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#2D3A7C" }}>Wovely</span>
          <span style={{ fontSize: 12, color: "#6B6B8A", marginLeft: 8 }}>Stitch Vision</span>
        </div>

        {data.image_url && <img src={data.image_url} alt="" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} />}

        {r.confidence === "low" && (
          <div style={{ background: "#FFF8EC", border: "1px solid #F0D9A8", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#8B6914", lineHeight: 1.5 }}>
            Best guess — confidence is low
          </div>
        )}

        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#2D3A7C", marginBottom: 6 }}>{r.stitch_name}</div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ background: diffColor + "22", color: diffColor, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{r.difficulty}</span>
          {r.confidence === "high" && <span style={{ background: "#D8EAD8", color: "#5C9E7A", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>High confidence</span>}
          {(r.also_known_as || []).map(name => (
            <span key={name} style={{ background: "#EDE4F7", color: "#9B7EC8", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>{name}</span>
          ))}
        </div>

        <div style={{ fontSize: 14, color: "#6B6B8A", lineHeight: 1.7, marginBottom: 16 }}>{r.description}</div>

        {r.common_uses && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Common uses</div>
            <div style={{ fontSize: 13, color: "#6B6B8A", lineHeight: 1.6 }}>{r.common_uses}</div>
          </div>
        )}

        {r.tutorial_search && (
          <button onClick={() => window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(r.tutorial_search), "_blank")} style={{ width: "100%", background: "#9B7EC8", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(155,126,200,.3)" }}>
            Watch a tutorial →
          </button>
        )}
      </div>

      {/* CTA banner */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#9B7EC8", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 -4px 16px rgba(0,0,0,.1)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Identify any crochet stitch instantly</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Free on Wovely</div>
        </div>
        <a href="/stitch-vision" style={{ background: "#fff", color: "#9B7EC8", borderRadius: 99, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>Try Stitch Vision →</a>
      </div>
    </div>
  );
};

export default StitchResultPage;

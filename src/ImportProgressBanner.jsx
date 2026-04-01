import { useEffect } from "react";

const stageLabel = (job) => {
  if (job.status === "error") return "Something went wrong — try again";
  if (job.status === "done") return "Pattern saved! \u2728";
  const p = job.pct || 0;
  if (p <= 10) return "Reading your file\u2026";
  if (p <= 30) return "Pulling the pattern apart\u2026";
  if (p <= 60) return "Working on it\u2026";
  if (p <= 85) return "Building your workspace\u2026";
  return "Almost there\u2026";
};

const ImportProgressBanner = ({ job, onDismiss }) => {
  useEffect(() => {
    if (job.status === "done") {
      const t = setTimeout(onDismiss, 3000);
      return () => clearTimeout(t);
    }
  }, [job.status]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, height: 64,
      background: "#9B7EC8", display: "flex", alignItems: "center", padding: "0 20px", gap: 14,
      fontFamily: "Inter,-apple-system,sans-serif", boxShadow: "0 4px 16px rgba(155,126,200,.3)",
    }}>
      <style>{`@keyframes bevSpin{to{transform:rotate(360deg)}}`}</style>

      {/* Bev spinner */}
      <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2.5px solid rgba(255,255,255,0.25)", borderTopColor: "#fff",
          animation: "bevSpin 1s linear infinite",
        }} />
        <img src="/bev_neutral.png" alt="" style={{
          position: "absolute", inset: 4, width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
        }} />
      </div>

      {/* Center: label + progress bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {stageLabel(job)}
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", height: 3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ background: "#fff", height: "100%", borderRadius: 2, width: `${job.pct || 0}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Right: status indicator or dismiss */}
      {job.status === "running" && (
        <button onClick={onDismiss} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 20,
          cursor: "pointer", padding: "4px 8px", flexShrink: 0, lineHeight: 1,
        }}>&times;</button>
      )}
      {job.status === "done" && (
        <div style={{
          background: "rgba(92,158,122,0.3)", borderRadius: 99, padding: "4px 12px",
          fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0, maxWidth: 180,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ✓ Saved!{job.patternTitle ? ` — ${job.patternTitle}` : ""}
        </div>
      )}
      {job.status === "error" && (
        <button onClick={onDismiss} style={{
          background: "rgba(192,90,90,0.3)", borderRadius: 99, padding: "4px 12px",
          fontSize: 12, fontWeight: 600, color: "#fff", border: "none", cursor: "pointer", flexShrink: 0,
        }}>Import failed</button>
      )}
    </div>
  );
};

export default ImportProgressBanner;

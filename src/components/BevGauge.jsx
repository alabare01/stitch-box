// BevGauge — Wovely "Bev Aesthetic v1.0" (Session 54 redesign)
// Semicircular score gauge for BevCheck results.
// Semantics (unchanged from prior version): HIGH score = LEFT (pass), LOW score = RIGHT (issues).

// --- Palette (Bev Aesthetic v1.0 — do not substitute) ---
const ZONE = {
  pass: "#A4C2C3",     // dusty teal — high score (80+)
  warning: "#E2D985",  // soft buttercup — heads-up (60–79)
  issues: "#CEA0A4",   // dusty rose — low score (<60)
};
const NAVY = "#2D3A7C";
const INK_SECONDARY = "#6B6B8A";
const LAVENDER = "#9B7EC8";
const LAVENDER_TINT = "rgba(155,126,200,0.14)";
const PALE_LAV = "#EDE4F7";
const GOLD = "#B8944A";          // muted antique gold (replaces retired #C9A84C)
const RIM_LIGHT = "rgba(255,255,255,0.92)";
const RIM_GLOW = "rgba(237,228,247,0.85)";

const STATE_LABEL = {
  pass: "Looks Good",
  warning: "Heads Up",
  issues: "Issues Found",
};

const ADVISORY_IDS = new Set(["translation", "structure"]);

// --- Legacy exports (kept for callsite compatibility) ---

// Pre-calculated needle endpoints from pivot (100,100), length 58px
// pass: 218° → (54, 64)   warning: 270° → (100, 42)   issues: 322° → (146, 64)
export const NEEDLE_END = { pass: "54 64", warning: "100 42", issues: "146 64" };

/**
 * Derive a state string from any BevCheck result shape.
 * New API returns result.state directly.
 * Old API returns result.overall ("valid"|"review"|"issues") + result.score.
 */
export const deriveState = (result) => {
  if (!result) return "warning";
  if (result.state === "pass" || result.state === "warning" || result.state === "issues") return result.state;
  if (result.overall === "valid") return "pass";
  if (result.overall === "issues") return "issues";
  if (result.overall === "review") return "warning";
  if (typeof result.score === "number") {
    if (result.score >= 80) return "pass";
    if (result.score >= 60) return "warning";
    return "issues";
  }
  return "warning";
};

/** Sentence-case a label: uppercase first char, lowercase the rest */
export const sentenceCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

/** Determine tier with fallback to id-based lookup */
export const checkTier = (c) => c.tier || (ADVISORY_IDS.has(c.id) ? "advisory" : "core");

// --- Internal helpers ---

const scoreToState = (score) => (score >= 80 ? "pass" : score >= 60 ? "warning" : "issues");

// Preserves existing semantics: HIGH score = LEFT, LOW score = RIGHT.
// 100% → 180° (leftmost), 0% → 360° (rightmost), 68% → 237.6° (upper-left of top).
const scoreToAngle = (score) => 360 - Math.max(0, Math.min(100, score)) * 1.8;

const polar = (cx, cy, r, deg) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/**
 * BevGauge
 * Props:
 *   score       number [0..100] — when provided, drives needle position and hero number.
 *                                 Also derives `state` internally (overrides any state prop).
 *   state       "pass"|"warning"|"issues" — legacy fallback when score is absent.
 *   issueCount  number — count for the supporting sentence. Omit or 0 to hide.
 */
const BevGauge = ({ state: stateProp, score, issueCount = 0 }) => {
  const hasScore = typeof score === "number" && !Number.isNaN(score);

  if (hasScore && stateProp != null && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[BevGauge] Both `score` and `state` were passed — `score` takes precedence.");
  }

  const state = hasScore ? scoreToState(score) : (stateProp || "warning");
  const label = STATE_LABEL[state] ?? "Heads Up";
  const scoreText = hasScore ? `${Math.round(score)}%` : null;
  const supportText = issueCount > 0
    ? `Bev spotted ${issueCount} ${issueCount === 1 ? "thing" : "things"} worth a second look.`
    : null;

  // Gauge geometry
  const CX = 100, CY = 100, ARC_R = 84, NEEDLE_LEN = 62;
  const legacyAngle = { pass: 218, warning: 270, issues: 322 }[state] ?? 270;
  const angle = hasScore ? scoreToAngle(score) : legacyAngle;
  const needle = polar(CX, CY, NEEDLE_LEN, angle);

  const a11yLabel = [
    "BevCheck score",
    hasScore ? `${Math.round(score)} percent` : null,
    label.toLowerCase(),
    supportText,
  ].filter(Boolean).join(", ");

  const ZoneTag = ({ color, text }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span>{text}</span>
    </span>
  );

  return (
    <div
      role="img"
      aria-label={a11yLabel}
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.45)",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(45,58,124,0.08)",
        padding: "26px 22px 24px",
        textAlign: "center",
      }}
    >
      {/* BEVCHECK pill */}
      <div style={{
        display: "inline-block",
        background: LAVENDER_TINT,
        color: LAVENDER,
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.4,
        padding: "5px 12px",
        borderRadius: 9999,
        marginBottom: 10,
      }}>BEVCHECK</div>

      {/* "Bev's Read" heading */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22,
        fontWeight: 700,
        color: NAVY,
        marginBottom: 18,
        letterSpacing: -0.2,
      }}>Bev's Read</div>

      {/* Gauge SVG */}
      <svg
        viewBox="0 0 200 124"
        aria-hidden="true"
        focusable="false"
        style={{ width: "100%", maxWidth: 300, display: "block", margin: "0 auto" }}
      >
        <defs>
          <linearGradient id="bevArcGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ZONE.pass} />
            <stop offset="50%" stopColor={ZONE.warning} />
            <stop offset="100%" stopColor={ZONE.issues} />
          </linearGradient>
          <linearGradient id="bevSpecular" x1="0" y1="0.1" x2="1" y2="0.6">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <clipPath id="bevFaceClip"><circle cx="100" cy="78" r="24" /></clipPath>
          <filter id="bevLift" x="-20%" y="-20%" width="140%" height="170%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2D3A7C" floodOpacity="0.1" />
          </filter>
          <filter id="bevNeedleShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1.4" stdDeviation="1.1" floodColor="#2D3A7C" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* Soft lift shadow + background track */}
        <path
          d="M 16 100 A 84 84 0 0 1 184 100"
          fill="none"
          stroke={PALE_LAV}
          strokeWidth="22"
          strokeLinecap="round"
          opacity="0.75"
          filter="url(#bevLift)"
        />

        {/* Colored gradient arc (translucent glass) */}
        <path
          d="M 16 100 A 84 84 0 0 1 184 100"
          fill="none"
          stroke="url(#bevArcGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Upper-left specular highlight */}
        <path
          d="M 16 100 A 84 84 0 0 1 100 16"
          fill="none"
          stroke="url(#bevSpecular)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Inner rim pale-lavender glow */}
        <path
          d="M 26 100 A 74 74 0 0 1 174 100"
          fill="none"
          stroke={RIM_GLOW}
          strokeWidth="1.25"
          opacity="0.75"
        />

        {/* Outer rim bright line (upper-left concentrated) */}
        <path
          d="M 16 100 A 84 84 0 0 1 80 22"
          fill="none"
          stroke={RIM_LIGHT}
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Bev (background — no disc, clipped to arc interior, behind needle) */}
        <image
          href="/bev_neutral.png"
          x="76"
          y="54"
          width="48"
          height="48"
          clipPath="url(#bevFaceClip)"
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Needle (above Bev) */}
        <g filter="url(#bevNeedleShadow)">
          <line
            x1={CX}
            y1={CY}
            x2={needle.x}
            y2={needle.y}
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r="6.5" fill={GOLD} />
          <circle cx={CX} cy={CY} r="2" fill="#fff" opacity="0.55" />
        </g>

        {/* Endpoint % labels */}
        <text x="16" y="118" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="8" fontWeight="600" fill={NAVY} opacity="0.75">0%</text>
        <text x="184" y="118" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="8" fontWeight="600" fill={NAVY} opacity="0.75">100%</text>
      </svg>

      {/* Zone labels (outside arc — navy text + colored dot) */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 300,
        margin: "8px auto 0",
        padding: "0 2px",
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        color: NAVY,
      }}>
        <ZoneTag color={ZONE.pass} text="PASS" />
        <ZoneTag color={ZONE.warning} text="HEADS UP" />
        <ZoneTag color={ZONE.issues} text="ISSUES" />
      </div>

      {/* Hero score number */}
      {scoreText && (
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 56,
          fontWeight: 700,
          color: NAVY,
          lineHeight: 1,
          marginTop: 22,
          letterSpacing: -1.5,
        }}>{scoreText}</div>
      )}

      {/* State label */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: scoreText ? 16 : 18,
        fontWeight: 600,
        color: NAVY,
        marginTop: scoreText ? 4 : 14,
      }}>{label}</div>

      {/* Supporting italic copy */}
      {supportText && (
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 13,
          color: INK_SECONDARY,
          marginTop: 10,
          lineHeight: 1.55,
          maxWidth: 300,
          marginLeft: "auto",
          marginRight: "auto",
        }}>{supportText}</div>
      )}
    </div>
  );
};

export default BevGauge;

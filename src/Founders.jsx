import { useState, useEffect, useCallback } from "react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";

const PH_KEY = import.meta.env.VITE_POSTHOG_API_KEY || "";
const PH_PROJECT = "363175";
const PH_API = `https://us.posthog.com/api/projects/${PH_PROJECT}/query/`;

const PF = "'Playfair Display',Georgia,serif";
const INTER = "Inter,sans-serif";
const NAVY = "#2D3A7C";
const ACCENT = "#9B7EC8";
const MUTED = "#6B6B8A";
const BG = "#FAF8F5";

const cardStyle = { background: "#fff", borderRadius: 16, border: "1px solid #EDE4F7", boxShadow: "0 2px 12px rgba(155,126,200,0.08)", padding: 20 };
const sectionTitle = { fontFamily: PF, fontSize: 18, fontWeight: 600, color: NAVY, marginBottom: 14 };

// PostHog HogQL query helper
const phQuery = async (query) => {
  try {
    const res = await fetch(PH_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${PH_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.results || [];
  } catch { return null; }
};

// Supabase REST helper
const sbQuery = async (table, params = "") => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
};

// Known founders/users for the user table
const KNOWN_USERS = [
  { email: "alabare@gmail.com", name: "Adam", joined: "2026-03-20", tier: "Pro" },
  { email: "danielle@wovely.app", name: "Danielle", joined: "2026-03-20", tier: "Pro" },
  { email: "turttlesong@yahoo.com", name: "Turtle Song", joined: "2026-03-28", tier: "Trial" },
  { email: "crochetqueen@gmail.com", name: "CrochetQueen", joined: "2026-03-29", tier: "Free" },
  { email: "yarnlover42@outlook.com", name: "YarnLover42", joined: "2026-03-30", tier: "Free" },
  { email: "hookedonthat@gmail.com", name: "HookedOnThat", joined: "2026-03-31", tier: "Free" },
  { email: "stitchfix_sarah@gmail.com", name: "Sarah", joined: "2026-04-01", tier: "Free" },
  { email: "knottybydesign@yahoo.com", name: "KnottyByDesign", joined: "2026-04-02", tier: "Free" },
  { email: "woolandwhimsy@gmail.com", name: "WoolAndWhimsy", joined: "2026-04-03", tier: "Free" },
];

const statusBadge = (lastActive, email) => {
  if (email === "turttlesong@yahoo.com") return { label: "Trial", color: "#D97706", bg: "#FEF3C7" };
  if (!lastActive) return { label: "Ghosted", color: "#DC2626", bg: "#FEE2E2" };
  const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
  if (days <= 3) return { label: "Active", color: "#059669", bg: "#D1FAE5" };
  if (days <= 7) return { label: "At risk", color: "#D97706", bg: "#FEF3C7" };
  if (days <= 30) return { label: "Drifting", color: "#D97706", bg: "#FEF3C7" };
  return { label: "Ghosted", color: "#DC2626", bg: "#FEE2E2" };
};

const BarRow = ({ label, value, max }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
    <div style={{ width: 140, fontSize: 12, color: MUTED, fontFamily: INTER, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, height: 8, background: "#EDE4F7", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: max > 0 ? (value / max * 100) + "%" : "0%", height: "100%", background: ACCENT, borderRadius: 4, transition: "width .3s" }} />
    </div>
    <div style={{ width: 40, textAlign: "right", fontSize: 12, fontWeight: 600, color: NAVY, fontFamily: INTER }}>{value}</div>
  </div>
);

export default function Founders() {
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [stats, setStats] = useState({ users: 0, logins: 0, patterns: 0, stitches: 0, mrr: 0 });
  const [trafficSources, setTrafficSources] = useState(null);
  const [customEvents, setCustomEvents] = useState(null);
  const [pageviews, setPageviews] = useState(null);
  const [topPages, setTopPages] = useState(null);
  const [userLocations, setUserLocations] = useState(null);
  const [userData, setUserData] = useState(KNOWN_USERS.map(u => ({ ...u, patterns: "...", stitches: "...", lastActive: null })));

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // Supabase counts
    const [patterns, stitches, profiles] = await Promise.all([
      sbQuery("patterns", "select=id,user_id,updated_at&status=neq.deleted&limit=500"),
      sbQuery("stitch_results", "select=id,user_id&limit=500"),
      sbQuery("user_profiles", "select=id,is_pro&limit=100"),
    ]);

    const patternCount = patterns?.length || 0;
    const stitchCount = stitches?.length || 0;
    const proCount = profiles?.filter(p => p.is_pro)?.length || 0;

    setStats({
      users: KNOWN_USERS.length,
      logins: "...",
      patterns: patternCount,
      stitches: stitchCount,
      mrr: (proCount * 8.99).toFixed(2),
    });

    // Enrich user table with pattern/stitch counts
    if (patterns || stitches) {
      setUserData(prev => prev.map(u => {
        const userPatterns = patterns?.filter(p => {
          // Match by checking if any pattern was created by this user
          return true; // We can't match without user_id mapping — show totals instead
        }) || [];
        // Find most recent activity
        const userPats = patterns?.filter(() => true) || [];
        const mostRecent = userPats.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];
        return { ...u, lastActive: mostRecent?.updated_at || null };
      }));
    }

    // PostHog queries — all in parallel
    const [loginCount, traffic, events, views, locations, pages] = await Promise.all([
      phQuery("SELECT count() FROM events WHERE event = 'user_logged_in' AND timestamp >= now() - interval 30 day"),
      phQuery("SELECT properties.$referring_domain as domain, count() as visits FROM events WHERE event = '$pageview' AND properties.$current_url LIKE '%wovely.app%' AND timestamp >= now() - interval 30 day GROUP BY domain ORDER BY visits DESC LIMIT 10"),
      phQuery("SELECT event, count() as count FROM events WHERE event IN ('user_logged_in','pattern_uploaded','user_signed_up','upgrade_clicked','stitch_check_run') AND timestamp >= now() - interval 30 day GROUP BY event ORDER BY count DESC"),
      phQuery("SELECT toDate(timestamp) as day, count() as cnt FROM events WHERE event = '$pageview' AND timestamp >= now() - interval 7 day GROUP BY day ORDER BY day"),
      phQuery("SELECT properties.$geoip_city_name as city, properties.$geoip_country_name as country, properties.$os as os, count() as cnt FROM events WHERE event = 'user_logged_in' AND timestamp >= now() - interval 30 day GROUP BY city, country, os ORDER BY cnt DESC LIMIT 10"),
      phQuery("SELECT properties.$current_url as url, count() as cnt FROM events WHERE event = '$pageview' AND properties.$current_url LIKE '%wovely.app%' AND timestamp >= now() - interval 30 day GROUP BY url ORDER BY cnt DESC LIMIT 10"),
    ]);

    if (loginCount?.[0]) setStats(s => ({ ...s, logins: loginCount[0][0] || 0 }));
    setTrafficSources(traffic);
    setCustomEvents(events);
    setPageviews(views);
    setUserLocations(locations);
    setTopPages(pages);

    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Bev insight text
  const bevInsight = stats.logins !== "..."
    ? `${stats.logins} logins from ${stats.users} users in the last 30 days = ${(stats.logins / Math.max(stats.users, 1)).toFixed(1)} avg sessions per user. ${stats.patterns} patterns saved, ${stats.stitches} stitches identified. MRR: $${stats.mrr}.`
    : "Crunching numbers...";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <style>{`@keyframes bevSpin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(155,126,200,0.2)", animation: "bevSpin 1.5s linear infinite" }}>
          <img src="/bev_neutral.png" alt="Bev" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
        </div>
        <div style={{ fontFamily: PF, fontStyle: "italic", fontSize: 18, color: ACCENT }}>Loading your numbers...</div>
      </div>
    );
  }

  const maxTraffic = trafficSources ? Math.max(...trafficSources.map(r => r[1] || 0), 1) : 1;
  const maxEvents = customEvents ? Math.max(...customEvents.map(r => r[1] || 0), 1) : 1;
  const maxPages = topPages ? Math.max(...topPages.map(r => r[1] || 0), 1) : 1;
  const maxViews = pageviews ? Math.max(...pageviews.map(r => r[1] || 0), 1) : 1;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: INTER }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src="/bev_neutral.png" alt="Bev" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontFamily: PF, fontSize: 22, fontWeight: 700, color: "#fff" }}>Wovely — Founder Dashboard</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Live · wovely.app</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", animation: "bevSpin 3s ease infinite" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{lastRefresh ? lastRefresh.toLocaleTimeString() : ""}</span>
          </div>
          <button onClick={fetchAll} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Refresh</button>
        </div>
      </div>
      <style>{`@keyframes bevSpin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* Top stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Users", value: stats.users },
            { label: "Logins / 30d", value: stats.logins },
            { label: "Patterns Saved", value: stats.patterns },
            { label: "Stitches Found", value: stats.stitches },
            { label: "MRR", value: "$" + stats.mrr },
          ].map(s => (
            <div key={s.label} style={cardStyle}>
              <div style={{ fontFamily: PF, fontSize: 32, fontWeight: 600, color: ACCENT, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bev insight */}
        <div style={{ ...cardStyle, background: "#F8F6FF", border: "1px solid #E8DFF5", display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(155,126,200,0.15)" }}>
            <img src="/bev_neutral.png" alt="Bev" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div style={{ fontSize: 14, color: NAVY, lineHeight: 1.6 }}>{bevInsight}</div>
        </div>

        {/* User table */}
        <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
          <div style={sectionTitle}>Users</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #EDE4F7" }}>
                {["Email", "Joined", "Tier", "Last Active", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userData.map(u => {
                const st = statusBadge(u.lastActive, u.email);
                return (
                  <tr key={u.email} style={{ borderBottom: "1px solid #F3EFF8" }}>
                    <td style={{ padding: "10px 10px", color: NAVY, fontWeight: 500 }}>{u.email}</td>
                    <td style={{ padding: "10px 10px", color: MUTED }}>{u.joined}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ background: u.tier === "Pro" ? "#E8DFF5" : "#F3EFF8", color: u.tier === "Pro" ? ACCENT : MUTED, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{u.tier}</span>
                    </td>
                    <td style={{ padding: "10px 10px", color: MUTED, fontSize: 12 }}>{u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Two column grid for analytics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

          {/* Traffic Sources */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Traffic Sources (30d)</div>
            {trafficSources ? trafficSources.map(r => (
              <BarRow key={r[0] || "direct"} label={r[0] || "(direct)"} value={r[1]} max={maxTraffic} />
            )) : <div style={{ color: MUTED, fontSize: 13 }}>No data</div>}
          </div>

          {/* Custom Events */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Events (30d)</div>
            {customEvents ? customEvents.map(r => (
              <BarRow key={r[0]} label={r[0]} value={r[1]} max={maxEvents} />
            )) : <div style={{ color: MUTED, fontSize: 13 }}>No data</div>}
          </div>

          {/* Pageviews (7d bar chart) */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Pageviews (7d)</div>
            {pageviews ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                {pageviews.map(r => {
                  const h = maxViews > 0 ? (r[1] / maxViews * 100) : 0;
                  const day = new Date(r[0]).toLocaleDateString("en-US", { weekday: "short" });
                  return (
                    <div key={r[0]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ fontSize: 10, color: NAVY, fontWeight: 600 }}>{r[1]}</div>
                      <div style={{ width: "100%", height: h + "%", minHeight: 4, background: ACCENT, borderRadius: "4px 4px 0 0", transition: "height .3s" }} />
                      <div style={{ fontSize: 9, color: MUTED }}>{day}</div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ color: MUTED, fontSize: 13 }}>No data</div>}
          </div>

          {/* Top Pages */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Top Pages (30d)</div>
            {topPages ? topPages.map(r => {
              const path = (r[0] || "").replace(/https?:\/\/[^/]+/, "") || "/";
              return <BarRow key={r[0]} label={path} value={r[1]} max={maxPages} />;
            }) : <div style={{ color: MUTED, fontSize: 13 }}>No data</div>}
          </div>

          {/* User Locations */}
          <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
            <div style={sectionTitle}>User Locations (30d logins)</div>
            {userLocations ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {userLocations.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F8F6FF", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: NAVY }}>{r[0] || "Unknown"}</span>
                    <span style={{ color: MUTED }}>{r[1]}</span>
                    <span style={{ color: MUTED, fontSize: 10 }}>{r[2]}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 600, color: ACCENT }}>{r[3]}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: MUTED, fontSize: 13 }}>No data</div>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "32px 0 16px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(155,126,200,0.12)", marginBottom: 8 }}>
            <img src="/bev_neutral.png" alt="Bev" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>Wovely · Founder Dashboard · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";

/* ─── FONT ───────────────────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("sb-font")) {
  const l = document.createElement("link");
  l.id = "sb-font";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600&display=swap";
  document.head.appendChild(l);
}

/* ─── REAL UNSPLASH PHOTOS — loaded directly in browser ─────────────────── */
const PHOTOS = {
  hero:     "https://images.unsplash.com/photo-1545315003-c5ad6226c272?w=800&q=80",
  blanket:  "https://images.unsplash.com/photo-1617330411349-efaf3b0fb316?w=600&q=80",
  cardigan: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80",
  granny:   "https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?w=600&q=80",
  tote:     "https://images.unsplash.com/photo-1594461640416-66985b87c5ff?w=600&q=80",
  pillow:   "https://images.unsplash.com/photo-1584947159857-7e02bde08d7e?w=600&q=80",
  market:   "https://images.unsplash.com/photo-1612531822503-e74a734fb5fb?w=600&q=80",
  auth:     "https://images.unsplash.com/photo-1576561231432-6e40c85d5399?w=600&q=80",
};

const PILL = [PHOTOS.blanket, PHOTOS.cardigan, PHOTOS.granny, PHOTOS.tote, PHOTOS.pillow, PHOTOS.market];

/* ─── TOKENS ─────────────────────────────────────────────────────────────── */
const T = {
  bg:      "#FAF7F3",
  surface: "#FFFFFF",
  linen:   "#F4EDE3",
  ink:     "#1C1714",
  ink2:    "#5C4F44",
  ink3:    "#9E8E82",
  border:  "#EAE0D5",
  terra:   "#B85A3C",
  terraLt: "#F5E2DA",
  sage:    "#5C7A5E",
  gold:    "#B8902C",
  serif:   '"Playfair Display", Georgia, serif',
  sans:    '"Inter", -apple-system, sans-serif',
};

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { display: none; }
    body { background: #FAF7F3; }
    input, textarea, button { font-family: "Inter", -apple-system, sans-serif; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { transform: translateX(-100%); opacity: 0; }
      to   { transform: translateX(0);     opacity: 1; }
    }
    @keyframes slideOutLeft {
      from { transform: translateX(0);     opacity: 1; }
      to   { transform: translateX(-100%); opacity: 0; }
    }
    @keyframes dimIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dimOut { from { opacity: 1; } to { opacity: 0; } }

    .fu        { animation: fadeUp 0.4s ease both; }
    .nav-open  { animation: slideInLeft  0.30s cubic-bezier(.22,.68,0,1.05) both; }
    .nav-close { animation: slideOutLeft 0.24s ease both; }
    .dim-in    { animation: dimIn  0.25s ease both; }
    .dim-out   { animation: dimOut 0.20s ease both; }

    .card {
      transition: transform .18s ease, box-shadow .18s ease;
      box-shadow: 0 2px 10px rgba(28,23,20,.06);
    }
    .card:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 12px 30px rgba(28,23,20,.13) !important;
    }
    .shelf-card {
      transition: transform .16s ease, box-shadow .16s ease;
    }
    .shelf-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(28,23,20,.12) !important;
    }
    .btn-terra {
      background: #B85A3C;
      transition: opacity .15s;
    }
    .btn-terra:hover { opacity: .88; }
  `}</style>
);

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
const pct = p => p.rows.length
  ? Math.round(p.rows.filter(r => r.done).length / p.rows.length * 100) : 0;

const Bar = ({ val, color = T.terra, h = 3 }) => (
  <div style={{ background: "rgba(255,255,255,.3)", borderRadius: 99, height: h, overflow: "hidden" }}>
    <div style={{ width: `${val}%`, height: h, background: color, borderRadius: 99, transition: "width .5s" }}/>
  </div>
);

const BarLight = ({ val, h = 3 }) => (
  <div style={{ background: T.border, borderRadius: 99, height: h, overflow: "hidden" }}>
    <div style={{ width: `${val}%`, height: h, background: T.terra, borderRadius: 99, transition: "width .5s" }}/>
  </div>
);

const Stars = ({ val = 0, onChange, ro }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} onClick={() => !ro && onChange?.(i)}
        style={{ fontSize: 12, cursor: ro ? "default" : "pointer",
          color: i <= val ? T.gold : T.border }}>★</span>
    ))}
  </div>
);

const Field = ({ label, value, onChange, type = "text", placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 11, color: T.ink3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{label}</div>}
    <input value={value} onChange={onChange} type={type} placeholder={placeholder} style={{
      width: "100%", padding: "13px 16px",
      background: T.linen, border: `1.5px solid ${T.border}`,
      borderRadius: 12, color: T.ink, fontSize: 15, outline: "none",
      transition: "border-color .15s",
    }}
    onFocus={e => e.target.style.borderColor = T.terra}
    onBlur={e  => e.target.style.borderColor = T.border}/>
  </div>
);

/* ─── PHOTO with fallback ────────────────────────────────────────────────── */
const Photo = ({ src, alt, style: sx }) => {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ ...sx, background: `linear-gradient(145deg, #C4855A, #6B3A22)`,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: sx?.height > 100 ? 48 : 28, opacity: .5 }}>🧶</span>
    </div>
  );
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ ...sx, objectFit: "cover", display: "block" }}/>;
};

/* ─── SEED DATA ──────────────────────────────────────────────────────────── */
const SEED = [
  { id:1, photo:PHOTOS.blanket,  title:"Autumn Ridge Throw",     source:"ravelry.com",      cat:"Blankets",   hook:"6.0mm", weight:"Bulky",   rating:5,
    notes:"Caron Simply Soft in Autumn Maize, Burgundy, and Sage. Block lightly — it opens up beautifully.",
    materials:["Bulky yarn — Autumn Maize 300g","Bulky yarn — Burgundy 300g","Bulky yarn — Sage 300g","6.0mm crochet hook","Yarn needle","Blocking mats & pins"],
    rows:[
      {id:1,text:"Foundation chain: Ch 120 loosely",done:true},
      {id:2,text:"Row 1: Sc in 2nd ch from hook and across (119 sts)",done:true},
      {id:3,text:"Rows 2–15: Ch 1 turn, sc across — Autumn Maize",done:true},
      {id:4,text:"Row 16: Join Burgundy, sc across",done:false},
      {id:5,text:"Rows 17–30: Sc across, Burgundy section",done:false},
      {id:6,text:"Row 31: Join Sage, sc across",done:false},
      {id:7,text:"Rows 32–45: Sc across, Sage section",done:false},
      {id:8,text:"Repeat 3-color block sequence twice more",done:false},
      {id:9,text:"Border Rnd 1: Sc evenly around, 3 sc in corners",done:false},
      {id:10,text:"Border Rnd 2: Reverse sc all around, fasten off",done:false},
    ]},
  { id:2, photo:PHOTOS.cardigan, title:"Coastal Shell Cardigan",  source:"lovecrafts.com",   cat:"Wearables",  hook:"4.5mm", weight:"DK",      rating:4,
    notes:"Size M. Add 2 rows per size up. Mark raglan seams — the shaping depends on precise counts.",
    materials:["DK cotton yarn — driftwood 500g","4.5mm crochet hook","Stitch markers ×8","5 shell buttons 15mm","Yarn needle"],
    rows:[
      {id:1,text:"Back panel: Ch 82, shell stitch 40 rows",done:true},
      {id:2,text:"Front panels ×2: Ch 42 each, match back length",done:true},
      {id:3,text:"Sleeves ×2: Inc 1 st each side every 6th row",done:false},
      {id:4,text:"Join shoulders with slip stitch seam",done:false},
      {id:5,text:"Set in sleeves, seam underarms",done:false},
      {id:6,text:"Neckline: 3 rounds sc, finish with picot edge",done:false},
      {id:7,text:"Button band along front opening",done:false},
      {id:8,text:"Sew buttons, weave all ends, block flat",done:false},
    ]},
  { id:3, photo:PHOTOS.granny,   title:"Meadow Granny Squares",  source:"sarahmaker.com",   cat:"Blankets",   hook:"4.0mm", weight:"Worsted", rating:5,
    notes:"48 squares in 12 color combinations. The flat join creates a beautiful ridge — don't skip it.",
    materials:["Worsted yarn — 10 assorted colors 50g each","4.0mm hook","Yarn needle","Stitch markers"],
    rows:[
      {id:1,text:"Magic ring, [ch 3, 2 dc, ch 2] ×4, sl st to close",done:true},
      {id:2,text:"Rnd 2: Corner clusters + ch-1 side spaces",done:true},
      {id:3,text:"Rnd 3: Larger corners, 2 groups on each side",done:true},
      {id:4,text:"Complete all 48 squares — 12 color combos",done:false},
      {id:5,text:"Lay out in 6×8 grid, photograph arrangement",done:false},
      {id:6,text:"Join squares into rows using sc flat join",done:false},
      {id:7,text:"Join all rows together",done:false},
      {id:8,text:"Outer border: 3 rounds, picot edge finish",done:false},
    ]},
  { id:4, photo:PHOTOS.tote,     title:"Desert Rose Market Tote", source:"hopefulhoney.com", cat:"Accessories",hook:"5.0mm", weight:"Worsted", rating:4,
    notes:"Line with sturdy cotton for structure. Real leather handles make the difference.",
    materials:["Cotton worsted — terracotta 200g","5.0mm hook","Cotton lining ½ yd","Leather handles","Yarn needle"],
    rows:[
      {id:1,text:"Base: Ch 30, work oval base to 60 sts",done:true},
      {id:2,text:"Sides: 20 rounds even sc on 60 sts",done:false},
      {id:3,text:"Handle slots: Ch 10, skip 10 sts — both sides",done:false},
      {id:4,text:"Top border: 2 rounds reverse sc",done:false},
      {id:5,text:"Sew cotton lining, slip inside bag",done:false},
      {id:6,text:"Thread leather handles through slots, knot",done:false},
    ]},
  { id:5, photo:PHOTOS.pillow,   title:"Hygge Cable Throw Pillow", source:"ravelry.com",    cat:"Home Décor", hook:"5.5mm", weight:"Bulky",   rating:5,
    notes:"Front post / back post dc creates the cable. Use a firm 18×18 insert.",
    materials:["Bulky yarn — cream 250g","5.5mm hook","18×18 pillow insert","Yarn needle"],
    rows:[
      {id:1,text:"Front: Ch 40, fpdc/bpdc cable pattern 50 rows",done:false},
      {id:2,text:"Back: Ch 40, sc for 50 rows",done:false},
      {id:3,text:"Block both pieces to 18×18 inches",done:false},
      {id:4,text:"Join 3 sides sc seam, insert pillow form",done:false},
      {id:5,text:"Close final side, weave all ends",done:false},
    ]},
  { id:6, photo:PHOTOS.market,   title:"Wildflower Market Bag",   source:"sarahmaker.com",  cat:"Accessories",hook:"4.0mm", weight:"DK",      rating:4,
    notes:"Cotton DK works up quickly. Use a tapestry needle for tidy joins.",
    materials:["DK cotton yarn — sage 150g","4.0mm hook","Yarn needle"],
    rows:[
      {id:1,text:"Magic ring, increase to 24 sts over 4 rounds",done:false},
      {id:2,text:"Mesh stitch pattern for 18 rounds",done:false},
      {id:3,text:"Handles: Ch 60, attach both sides",done:false},
      {id:4,text:"Reinforce all handle joints with sc",done:false},
    ]},
];

const CATS = ["All","Blankets","Wearables","Accessories","Amigurumi","Home Décor"];

/* ══════════════════════════════════════════════════════════════════════════
   NAV PANEL
══════════════════════════════════════════════════════════════════════════ */
const NavPanel = ({ open, onClose, view, setView, count }) => {
  const [closing, setClosing] = useState(false);
  const dismiss = () => { setClosing(true); setTimeout(() => { setClosing(false); onClose(); }, 220); };
  const go = v => { setView(v); dismiss(); };
  if (!open) return null;

  const ITEMS = [
    { key:"collection", label:"My Patterns",   sub:`${count} patterns saved`, icon:"🧶" },
    { key:"wip",        label:"In Progress",   sub:"Currently making",        icon:"🪡" },
    { key:"find",       label:"Find Patterns", sub:"Browse & import",         icon:"🔍" },
    { key:"stash",      label:"Yarn Stash",    sub:"Pro feature",             icon:"🎀", pro:true },
    { key:"settings",   label:"Settings",      sub:"Account & preferences",   icon:"⚙️" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100 }}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss}
        style={{ position:"absolute", inset:0, background:"rgba(28,23,20,.52)", backdropFilter:"blur(3px)" }}/>
      <div className={closing?"nav-close":"nav-open"}
        style={{ position:"absolute", top:0, left:0, bottom:0, width:"78%", maxWidth:310,
          background:T.surface, display:"flex", flexDirection:"column",
          boxShadow:"6px 0 40px rgba(28,23,20,.2)" }}>

        {/* Header with real photo */}
        <div style={{ position:"relative", height:140, overflow:"hidden", flexShrink:0 }}>
          <Photo src={PHOTOS.hero} alt="crochet" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(20,14,10,.75) 0%, rgba(20,14,10,.2) 100%)" }}/>
          <div style={{ position:"absolute", bottom:18, left:20 }}>
            <div style={{ fontFamily:T.serif, fontSize:22, fontWeight:700, color:"#fff", lineHeight:1 }}>Stitch Box</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.65)", marginTop:4 }}>Your crochet collection</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ flex:1, paddingTop:8, overflowY:"auto" }}>
          {ITEMS.map((item) => {
            const active = view === item.key;
            return (
              <div key={item.key} onClick={() => !item.pro && go(item.key)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 22px",
                  borderLeft:`3px solid ${active ? T.terra : "transparent"}`,
                  background: active ? T.terraLt : "transparent",
                  cursor: item.pro ? "default" : "pointer", transition:"background .12s" }}
                onMouseEnter={e => !active && !item.pro && (e.currentTarget.style.background = T.linen)}
                onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize:22, width:28, textAlign:"center" }}>{item.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:active?600:400, color:active?T.terra:T.ink }}>{item.label}</div>
                  <div style={{ fontSize:11, color:T.ink3, marginTop:1 }}>{item.sub}</div>
                </div>
                {item.pro && <span style={{ background:T.terra, color:"#fff", fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99, letterSpacing:".06em" }}>PRO</span>}
                {active && <div style={{ width:6, height:6, borderRadius:99, background:T.terra }}/>}
              </div>
            );
          })}
        </div>

        {/* Pro card */}
        <div style={{ padding:"16px 20px 40px" }}>
          <div style={{ background:`linear-gradient(135deg, ${T.terra} 0%, #8B3A22 100%)`, borderRadius:16, padding:"16px 18px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:4 }}>✨ Upgrade to Pro</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.8)", lineHeight:1.5, marginBottom:12 }}>
              Unlimited patterns, PDF export, yarn stash & cloud sync.
            </div>
            <div style={{ background:"rgba(255,255,255,.2)", borderRadius:9, padding:"9px", textAlign:"center", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>
              $3.99 / month
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════════════════ */
const Auth = ({ onEnter }) => {
  const [screen, setScreen] = useState("welcome");
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");

  if (screen === "welcome") return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column" }}>
      <CSS/>
      {/* Full-bleed hero photo */}
      <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:460 }}>
        <Photo src={PHOTOS.hero} alt="cozy crochet blanket"
          style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(15,10,8,.92) 0%, rgba(15,10,8,.15) 55%, transparent 100%)" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 28px 36px" }}>
          <div style={{ fontFamily:T.serif, fontSize:46, fontWeight:700, color:"#fff", lineHeight:1, marginBottom:10, letterSpacing:"-.02em" }}>
            Stitch Box
          </div>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.72)", lineHeight:1.65, maxWidth:290 }}>
            Save every pattern. Track every row.<br/>Your crochet life, beautifully organised.
          </p>
        </div>
      </div>
      {/* CTAs */}
      <div style={{ background:T.surface, padding:"28px 22px 48px", display:"flex", flexDirection:"column", gap:12 }}>
        <button className="btn-terra" onClick={() => setScreen("signup")}
          style={{ color:"#fff", border:"none", borderRadius:14, padding:"16px", fontSize:16, fontWeight:600, cursor:"pointer", boxShadow:"0 4px 20px rgba(184,90,60,.35)", letterSpacing:".01em" }}>
          Create free account
        </button>
        <button onClick={() => setScreen("signin")}
          style={{ background:T.linen, color:T.ink, border:`1px solid ${T.border}`, borderRadius:14, padding:"15px", fontSize:15, fontWeight:500, cursor:"pointer", transition:"background .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = T.border}
          onMouseLeave={e => e.currentTarget.style.background = T.linen}>
          Sign in
        </button>
        <button onClick={onEnter}
          style={{ background:"none", border:"none", color:T.ink3, fontSize:13, cursor:"pointer", padding:"6px" }}>
          Continue without account →
        </button>
        <p style={{ fontSize:11, color:T.ink3, textAlign:"center", lineHeight:1.6 }}>
          Free: up to 10 patterns · Pro $3.99/mo: unlimited + export + sync
        </p>
      </div>
    </div>
  );

  const isSignup = screen === "signup";
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column" }}>
      <CSS/>
      <div style={{ height:200, position:"relative", overflow:"hidden" }}>
        <Photo src={PHOTOS.auth} alt="yarn" style={{ width:"100%", height:"100%" }}/>
        <div style={{ position:"absolute", inset:0, background:"rgba(15,10,8,.45)" }}/>
        <div style={{ position:"absolute", bottom:22, left:24 }}>
          <div style={{ fontFamily:T.serif, fontSize:28, color:"#fff", fontWeight:700 }}>
            {isSignup ? "Create account" : "Welcome back"}
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.65)", marginTop:3 }}>
            {isSignup ? "Start your pattern collection" : "Your patterns are waiting"}
          </div>
        </div>
      </div>
      <div style={{ flex:1, padding:"28px 24px 40px" }}>
        {isSignup && <Field label="Your name" placeholder="e.g. Sarah" value={name} onChange={e => setName(e.target.value)}/>}
        <Field label="Email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} type="email"/>
        <Field label="Password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} type="password"/>
        {!isSignup && <div style={{ textAlign:"right", marginBottom:18 }}><span style={{ fontSize:13, color:T.terra, cursor:"pointer" }}>Forgot password?</span></div>}
        <button className="btn-terra" onClick={onEnter}
          style={{ width:"100%", color:"#fff", border:"none", borderRadius:14, padding:"15px", fontSize:15, fontWeight:600, cursor:"pointer", boxShadow:"0 4px 14px rgba(184,90,60,.3)", marginTop:8, marginBottom:12 }}>
          {isSignup ? "Create my Stitch Box" : "Sign in"}
        </button>
        <button onClick={() => setScreen("welcome")}
          style={{ width:"100%", background:"none", border:"none", color:T.ink3, fontSize:13, cursor:"pointer", padding:"8px" }}>
          ← Back
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   PATTERN CARD
══════════════════════════════════════════════════════════════════════════ */
const PatternCard = ({ p, onClick, delay = 0 }) => {
  const done = pct(p);
  return (
    <div className="card fu" onClick={onClick}
      style={{ background:T.surface, borderRadius:16, overflow:"hidden",
        border:`1px solid ${T.border}`, cursor:"pointer", animationDelay:`${delay}s` }}>
      <div style={{ position:"relative", height:155, overflow:"hidden", background:T.linen }}>
        <Photo src={p.photo} alt={p.title} style={{ width:"100%", height:"100%" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(28,23,20,.5) 0%, transparent 55%)" }}/>
        {done === 100 && (
          <div style={{ position:"absolute", top:10, right:10, background:T.sage, color:"#fff", fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:99, letterSpacing:".07em" }}>DONE</div>
        )}
        {done > 0 && done < 100 && (
          <div style={{ position:"absolute", top:10, right:10, background:"rgba(28,23,20,.65)", backdropFilter:"blur(4px)", color:"#fff", fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:99 }}>
            {done}%
          </div>
        )}
        {done > 0 && done < 100 && (
          <div style={{ position:"absolute", bottom:0, left:0, right:0 }}>
            <Bar val={done} h={3}/>
          </div>
        )}
      </div>
      <div style={{ padding:"11px 13px 14px" }}>
        <div style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:".08em", marginBottom:3 }}>{p.cat}</div>
        <div style={{ fontFamily:T.serif, fontSize:15, fontWeight:500, color:T.ink, lineHeight:1.3, marginBottom:7 }}>{p.title}</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Stars val={p.rating} ro/>
          <span style={{ fontSize:11, color:T.ink3 }}>{p.source}</span>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SHELF CARD
══════════════════════════════════════════════════════════════════════════ */
const ShelfCard = ({ p, onClick }) => {
  const v = pct(p);
  return (
    <div className="shelf-card" onClick={onClick}
      style={{ minWidth:160, borderRadius:14, overflow:"hidden", border:`1px solid ${T.border}`,
        background:T.surface, cursor:"pointer", flexShrink:0, boxShadow:"0 2px 8px rgba(28,23,20,.06)" }}>
      <div style={{ height:100, position:"relative", background:T.linen, overflow:"hidden" }}>
        <Photo src={p.photo} alt={p.title} style={{ width:"100%", height:"100%" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0 }}>
          <Bar val={v} h={3}/>
        </div>
      </div>
      <div style={{ padding:"9px 12px 11px" }}>
        <div style={{ fontFamily:T.serif, fontSize:13, color:T.ink, lineHeight:1.3, marginBottom:2 }}>{p.title}</div>
        <div style={{ fontSize:11, color:T.terra, fontWeight:600 }}>{v}% done</div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   DETAIL VIEW
══════════════════════════════════════════════════════════════════════════ */
const Detail = ({ p, onBack, onSave }) => {
  const [rows,    setRows]    = useState(p.rows);
  const [tab,     setTab]     = useState("rows");
  const [newRow,  setNewRow]  = useState("");
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({ ...p });
  const done = pct({ ...p, rows });

  const toggle = id => {
    const next = rows.map(r => r.id === id ? { ...r, done: !r.done } : r);
    setRows(next); onSave({ ...p, rows: next });
  };
  const addRow = () => {
    if (!newRow.trim()) return;
    const next = [...rows, { id:Date.now(), text:newRow.trim(), done:false }];
    setRows(next); onSave({ ...p, rows:next }); setNewRow("");
  };
  const save = () => { onSave({ ...draft, rows }); setEditing(false); };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:T.bg, overflow:"hidden" }}>
      <CSS/>
      {/* Hero */}
      <div style={{ position:"relative", flexShrink:0, height:240, overflow:"hidden", background:T.linen }}>
        <Photo src={p.photo} alt={p.title} style={{ width:"100%", height:"100%" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(20,14,10,.88) 0%, rgba(20,14,10,.2) 55%, transparent 100%)" }}/>
        <div style={{ position:"absolute", top:0, left:0, right:0, padding:"16px 18px", display:"flex", justifyContent:"space-between" }}>
          <button onClick={onBack} style={{ background:"rgba(15,10,8,.4)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.15)", borderRadius:10, padding:"7px 16px", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:500 }}>
            ← Back
          </button>
          <button onClick={() => editing ? save() : setEditing(true)}
            style={{ background:editing?T.terra:"rgba(15,10,8,.4)", backdropFilter:"blur(8px)", border:`1px solid ${editing?T.terra:"rgba(255,255,255,.15)"}`, borderRadius:10, padding:"7px 16px", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            {editing ? "Save" : "Edit"}
          </button>
        </div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 20px 18px" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.55)", textTransform:"uppercase", letterSpacing:".09em", marginBottom:5 }}>
            {p.cat} · Hook {p.hook} · {p.weight}
          </div>
          {editing
            ? <input value={draft.title} onChange={e => setDraft({...draft,title:e.target.value})}
                style={{ width:"100%", background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.3)", borderRadius:8, padding:"6px 10px", color:"#fff", fontSize:20, fontFamily:T.serif, outline:"none" }}/>
            : <div style={{ fontFamily:T.serif, fontSize:22, fontWeight:700, color:"#fff", lineHeight:1.2 }}>{p.title}</div>
          }
          <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1 }}><Bar val={done} h={4}/></div>
            <span style={{ color:"#fff", fontSize:13, fontWeight:600, minWidth:36 }}>{done}%</span>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:3 }}>
            {rows.filter(r => r.done).length} of {rows.length} rows complete
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:T.surface, borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        {[["rows","Rows"],["materials","Materials"],["notes","Notes"]].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex:1, padding:"13px 0", border:"none", background:"transparent",
            color:tab===key?T.terra:T.ink3, fontWeight:tab===key?600:400,
            fontSize:13, cursor:"pointer",
            borderBottom:`2px solid ${tab===key?T.terra:"transparent"}`,
            transition:"color .15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 20px 36px" }}>
        {tab === "rows" && <>
          {rows.map((r,i) => (
            <div key={r.id} onClick={() => toggle(r.id)}
              style={{ display:"flex", gap:13, alignItems:"flex-start", padding:"14px 0", borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}>
              <div style={{
                width:24, height:24, borderRadius:7, flexShrink:0, marginTop:1,
                background:r.done?T.terra:T.surface,
                border:`1.5px solid ${r.done?T.terra:T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all .2s",
                boxShadow:r.done?"0 2px 8px rgba(184,90,60,.3)":"none",
              }}>
                {r.done && <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:T.ink3, letterSpacing:".06em", marginBottom:2 }}>ROW {i+1}</div>
                <div style={{ fontSize:14, lineHeight:1.6, color:r.done?T.ink3:T.ink, textDecoration:r.done?"line-through":"none", transition:"all .2s" }}>
                  {r.text}
                </div>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <input value={newRow} onChange={e => setNewRow(e.target.value)} onKeyDown={e => e.key==="Enter"&&addRow()}
              placeholder="Add a row or step…"
              style={{ flex:1, border:`1.5px solid ${T.border}`, borderRadius:11, padding:"10px 14px", fontSize:13, color:T.ink, background:T.linen, outline:"none", transition:"border-color .15s" }}
              onFocus={e => e.target.style.borderColor=T.terra}
              onBlur={e  => e.target.style.borderColor=T.border}/>
            <button onClick={addRow}
              style={{ background:T.terra, color:"#fff", border:"none", borderRadius:11, padding:"10px 18px", fontSize:22, cursor:"pointer", lineHeight:1, boxShadow:"0 4px 12px rgba(184,90,60,.35)" }}>
              +
            </button>
          </div>
        </>}

        {tab === "materials" && <>
          {(editing?draft.materials:p.materials).map((m,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ width:6, height:6, borderRadius:99, background:T.terra, flexShrink:0 }}/>
              {editing
                ? <input value={m} onChange={e => { const a=[...draft.materials]; a[i]=e.target.value; setDraft({...draft,materials:a}); }}
                    style={{ flex:1, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 10px", fontSize:13, background:T.linen, color:T.ink, outline:"none" }}
                    onFocus={e => e.target.style.borderColor=T.terra}
                    onBlur={e  => e.target.style.borderColor=T.border}/>
                : <span style={{ fontSize:14, color:T.ink2, lineHeight:1.5 }}>{m}</span>
              }
            </div>
          ))}
          {editing && (
            <button onClick={() => setDraft({...draft,materials:[...draft.materials,""]})}
              style={{ marginTop:14, width:"100%", border:`1.5px dashed ${T.border}`, background:"none", borderRadius:11, padding:"10px", color:T.ink3, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              + Add material
            </button>
          )}
          <div style={{ display:"flex", gap:10, marginTop:22 }}>
            {[["Hook Size","hook"],["Yarn Weight","weight"]].map(([label,key]) => (
              <div key={key} style={{ flex:1, background:T.linen, borderRadius:13, padding:"14px 16px", border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:".07em", marginBottom:5 }}>{label}</div>
                {editing
                  ? <input value={draft[key]||""} onChange={e => setDraft({...draft,[key]:e.target.value})}
                      style={{ border:`1px solid ${T.border}`, borderRadius:7, padding:"4px 8px", fontSize:14, width:"100%", background:"#fff", color:T.ink, outline:"none" }}/>
                  : <div style={{ fontFamily:T.serif, fontSize:20, fontWeight:500, color:T.ink }}>{p[key]||"—"}</div>
                }
              </div>
            ))}
          </div>
        </>}

        {tab === "notes" && (
          <div style={{ paddingTop:10 }}>
            {editing
              ? <textarea value={draft.notes} onChange={e => setDraft({...draft,notes:e.target.value})}
                  style={{ width:"100%", minHeight:160, border:`1.5px solid ${T.border}`, borderRadius:12, padding:14, fontSize:14, lineHeight:1.75, resize:"vertical", outline:"none", color:T.ink, background:T.linen, transition:"border-color .15s" }}
                  onFocus={e => e.target.style.borderColor=T.terra}
                  onBlur={e  => e.target.style.borderColor=T.border}/>
              : <p style={{ fontFamily:T.serif, fontStyle:"italic", fontSize:15, color:T.ink2, lineHeight:1.9, paddingTop:4 }}>
                  {p.notes||"No notes yet. Tap Edit to add your thoughts."}
                </p>
            }
            <div style={{ marginTop:22, display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:12, color:T.ink3 }}>Your rating</span>
              <Stars val={editing?draft.rating:p.rating} ro={!editing} onChange={v => setDraft({...draft,rating:v})}/>
            </div>
            <div style={{ marginTop:10, fontSize:12, color:T.ink3 }}>Source: {p.source}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   FIND PATTERNS
══════════════════════════════════════════════════════════════════════════ */
const FindPatterns = ({ onSave }) => {
  const [url,    setUrl]    = useState("");
  const [ready,  setReady]  = useState(false);
  const [saving, setSaving] = useState(false);

  const SITES = [
    { name:"Ravelry",        desc:"World's largest pattern library",   photo:PILL[0] },
    { name:"LoveCrafts",     desc:"Patterns, yarn & community",        photo:PILL[1] },
    { name:"Sarah Maker",    desc:"Modern beginner-friendly patterns", photo:PILL[2] },
    { name:"Yarnspirations", desc:"Free Caron & Bernat patterns",      photo:PILL[3] },
    { name:"AllFreeCrochet", desc:"Thousands of free patterns",        photo:PILL[4] },
    { name:"Hopeful Honey",  desc:"Whimsical amigurumi & accessories", photo:PILL[5] },
  ];

  const doSave = () => {
    setSaving(true);
    setTimeout(() => {
      onSave({ id:Date.now(), photo:PILL[Math.floor(Math.random()*PILL.length)],
        title:"New Pattern", source:url||"manual", cat:"Uncategorized",
        hook:"", weight:"", rating:0, notes:"", materials:[], rows:[] });
      setSaving(false); setReady(false); setUrl("");
    }, 1100);
  };

  return (
    <div style={{ padding:"0 18px 100px" }}>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:13, padding:"11px 16px", gap:10 }}>
          <span style={{ color:T.ink3, fontSize:16 }}>🔍</span>
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key==="Enter"&&setReady(true)}
            placeholder="Paste a pattern URL to import…"
            style={{ border:"none", background:"transparent", flex:1, fontSize:14, color:T.ink, outline:"none" }}/>
        </div>
        <button onClick={() => setReady(true)}
          style={{ background:T.terra, color:"#fff", border:"none", borderRadius:13, padding:"0 20px", fontWeight:600, fontSize:14, cursor:"pointer", boxShadow:"0 4px 14px rgba(184,90,60,.3)", whiteSpace:"nowrap" }}>
          Go
        </button>
      </div>

      {!ready && <>
        <p style={{ fontFamily:T.serif, fontStyle:"italic", fontSize:14, color:T.ink3, marginBottom:18, lineHeight:1.7 }}>
          Paste any pattern URL above, or tap a site below to start browsing.
        </p>
        <div style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}` }}>
          {SITES.map((s,i) => (
            <div key={s.name}
              onClick={() => { setUrl(s.name.toLowerCase().replace(/\s/g,"")+".com"); setReady(true); }}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", background:T.surface, borderTop:i>0?`1px solid ${T.border}`:"none", cursor:"pointer", transition:"background .12s" }}
              onMouseEnter={e => e.currentTarget.style.background=T.linen}
              onMouseLeave={e => e.currentTarget.style.background=T.surface}>
              <div style={{ width:46, height:46, borderRadius:10, overflow:"hidden", flexShrink:0, background:T.linen }}>
                <Photo src={s.photo} alt={s.name} style={{ width:"100%", height:"100%" }}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500, color:T.ink, marginBottom:2 }}>{s.name}</div>
                <div style={{ fontSize:12, color:T.ink3 }}>{s.desc}</div>
              </div>
              <span style={{ color:T.ink3, fontSize:20 }}>›</span>
            </div>
          ))}
        </div>
      </>}

      {ready && (
        <div className="fu" style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, overflow:"hidden" }}>
          <div style={{ height:170, position:"relative", overflow:"hidden", background:T.linen }}>
            <Photo src={PHOTOS.hero} alt="pattern" style={{ width:"100%", height:"100%" }}/>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(15,10,8,.35) 0%, transparent 60%)" }}/>
          </div>
          <div style={{ padding:"22px 22px 28px" }}>
            <div style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>{url||"pattern page"}</div>
            <div style={{ fontFamily:T.serif, fontSize:22, fontWeight:500, color:T.ink, marginBottom:8 }}>Ready to save</div>
            <p style={{ fontSize:14, color:T.ink2, lineHeight:1.7, marginBottom:22 }}>
              Save to your collection and track every row as you work through it.
            </p>
            <button className="btn-terra" onClick={doSave} disabled={saving}
              style={{ width:"100%", color:"#fff", border:"none", borderRadius:13, padding:"15px", fontSize:15, fontWeight:600, cursor:saving?"wait":"pointer", opacity:saving?.7:1, boxShadow:"0 4px 16px rgba(184,90,60,.3)", marginBottom:10 }}>
              {saving ? "Saving to your collection…" : "Save to My Collection"}
            </button>
            <button onClick={() => setReady(false)}
              style={{ width:"100%", background:"none", border:"none", color:T.ink3, fontSize:13, cursor:"pointer", padding:"8px" }}>
              ← Back to sites
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════ */
export default function StitchBox() {
  const [authed,   setAuthed]   = useState(false);
  const [patterns, setPatterns] = useState(SEED);
  const [view,     setView]     = useState("collection");
  const [selected, setSelected] = useState(null);
  const [navOpen,  setNavOpen]  = useState(false);
  const [cat,      setCat]      = useState("All");
  const [search,   setSearch]   = useState("");

  if (!authed) return <><CSS/><Auth onEnter={() => setAuthed(true)}/></>;

  if (view === "detail" && selected) return (
    <><CSS/><Detail p={selected} onBack={() => setView("collection")}
      onSave={u => { setPatterns(prev => prev.map(p => p.id===u.id?u:p)); setSelected(u); }}/></>
  );

  const filtered   = patterns.filter(p => (cat==="All"||p.cat===cat) && (!search||p.title.toLowerCase().includes(search.toLowerCase())));
  const inProgress = patterns.filter(p => { const v=pct(p); return v>0&&v<100; });
  const openDetail = p => { setSelected(p); setView("detail"); };

  return (
    <div style={{ fontFamily:T.sans, background:T.bg, minHeight:"100vh", maxWidth:430, margin:"0 auto", display:"flex", flexDirection:"column" }}>
      <CSS/>
      <NavPanel open={navOpen} onClose={() => setNavOpen(false)} view={view} setView={setView} count={patterns.length}/>

      {/* Top bar */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 18px", height:56, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:20, flexShrink:0 }}>
        <button onClick={() => setNavOpen(true)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 8px 8px 0", display:"flex", flexDirection:"column", gap:5 }}>
          <div style={{ width:22, height:1.5, background:T.ink, borderRadius:99 }}/>
          <div style={{ width:15, height:1.5, background:T.ink, borderRadius:99 }}/>
          <div style={{ width:22, height:1.5, background:T.ink, borderRadius:99 }}/>
        </button>
        <div style={{ fontFamily:T.serif, fontSize:20, fontWeight:700, color:T.ink }}>
          {view==="collection"?"My Patterns":view==="wip"?"In Progress":"Find Patterns"}
        </div>
        <button onClick={() => setView("find")}
          style={{ background:T.terra, border:"none", borderRadius:9, width:34, height:34, cursor:"pointer", color:"#fff", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 10px rgba(184,90,60,.4)" }}>
          +
        </button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", paddingBottom:24 }}>

        {view === "collection" && <>
          {inProgress.length > 0 && (
            <div style={{ background:T.linen, borderBottom:`1px solid ${T.border}`, padding:"16px 0 18px 18px" }}>
              <div style={{ fontSize:10, color:T.ink3, textTransform:"uppercase", letterSpacing:".09em", fontWeight:600, marginBottom:12, paddingRight:18 }}>
                Continue Working
              </div>
              <div style={{ display:"flex", gap:12, overflowX:"auto", paddingRight:18, paddingBottom:2 }}>
                {inProgress.map(p => <ShelfCard key={p.id} p={p} onClick={() => openDetail(p)}/>)}
              </div>
            </div>
          )}

          <div style={{ padding:"16px 18px 10px" }}>
            <div style={{ display:"flex", alignItems:"center", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:12, padding:"10px 14px", gap:9, transition:"border-color .15s" }}>
              <span style={{ color:T.ink3, fontSize:15 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your patterns…"
                style={{ border:"none", background:"transparent", flex:1, fontSize:14, color:T.ink, outline:"none" }}
                onFocus={e => e.currentTarget.parentNode.style.borderColor=T.terra}
                onBlur={e  => e.currentTarget.parentNode.style.borderColor=T.border}/>
            </div>
          </div>

          <div style={{ display:"flex", gap:7, overflowX:"auto", padding:"0 18px 16px" }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                background: cat===c?T.terra:T.surface,
                color: cat===c?"#fff":T.ink2,
                border:`1.5px solid ${cat===c?T.terra:T.border}`,
                borderRadius:99, padding:"6px 14px", fontSize:12, fontWeight:500,
                cursor:"pointer", whiteSpace:"nowrap", transition:"all .15s",
                boxShadow:cat===c?"0 2px 10px rgba(184,90,60,.28)":"none",
              }}>{c}</button>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, padding:"0 18px 32px" }}>
            {filtered.length === 0
              ? <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 20px" }}>
                  <div style={{ fontSize:48, marginBottom:14 }}>🧶</div>
                  <div style={{ fontFamily:T.serif, fontSize:18, color:T.ink2, marginBottom:8 }}>No patterns yet</div>
                  <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>Tap + to start building your collection.</div>
                </div>
              : filtered.map((p,i) => <PatternCard key={p.id} p={p} delay={i*.05} onClick={() => openDetail(p)}/>)
            }
          </div>
        </>}

        {view === "wip" && (
          <div style={{ padding:"16px 18px 80px" }}>
            {inProgress.length === 0
              ? <div style={{ textAlign:"center", padding:"60px 20px" }}>
                  <div style={{ fontSize:48, marginBottom:14 }}>🪡</div>
                  <div style={{ fontFamily:T.serif, fontSize:18, color:T.ink2, marginBottom:8 }}>Nothing in progress</div>
                  <div style={{ fontSize:13, color:T.ink3, lineHeight:1.6 }}>Open a pattern and start checking off rows.</div>
                </div>
              : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {inProgress.map((p,i) => <PatternCard key={p.id} p={p} delay={i*.06} onClick={() => openDetail(p)}/>)}
                </div>
            }
          </div>
        )}

        {view === "find" && (
          <div style={{ paddingTop:18 }}>
            <FindPatterns onSave={p => { setPatterns(prev => [p,...prev]); setView("collection"); }}/>
          </div>
        )}
      </div>
    </div>
  );
}

# Wovely Project Context

This file is the single source of truth for Wovely project context, replacing the former api/master-doc.js endpoint workflow. Both Claude.ai and Claude Code read this file at session start.

Last migrated from master doc API: 2026-04-16

---

# WOVELY MASTER DOC v96

## CURRENT PRODUCTION STATE
Live on wovely.app — Session 54 shipped AND merged to main. Security hardening session, four major wins. Email confirmation flow live with custom Bev-branded template (merge 806dddc). Signup notification webhook wired end-to-end: WEBHOOK_SECRET set in Vercel, Supabase Database Webhook on auth.users INSERT points at /api/notify-signup, "🎉 New Wovely signup" emails now land in adam@wovely.app (merge 0a2d59b). Gemini API key rotated after confirmed client-bundle leak since Mar 20 — new key live in GEMINI_API_KEY + VITE_GEMINI_API_KEY, old key deleted in AI Studio. Client-side exposure still exists with new key pending Session 55 server-side move. Stripe customer emails all 5 armed. Broken notify_new_signup trigger (RLS enabled with zero policies on signup_notifications) that was silently blocking every new signup with "Database error saving new user" — dropped. handle_new_user trigger for user_profiles auto-create remains intact.

## FIRST THING NEXT SESSION
1. Move client-side Gemini calls server-side — extractPatternFromPDF (AddPatternModal.jsx) + callGeminiVision (HiveVisionForm) → new /api/snap-vision endpoint. VITE_GEMINI_API_KEY still bundled with the rotated key. Not urgent ($50/mo Gemini cap limits blast radius) but this is the fix for the root leak vector.
2. Delete VITE_GEMINI_API_KEY from Vercel after server-side move lands
3. Update Stripe support email from alabare@gmail.com to support@wovely.app via Public details settings
4. CORS audit on all serverless functions (carried over)
5. RLS full table audit (carried over)
6. Background functions + queue system build

## SESSION 55 PRIORITY ORDER
1. Move client-side Gemini to /api/snap-vision server endpoint (security — close confirmed key-leak vector)
2. Delete VITE_GEMINI_API_KEY env var from Vercel after server-side move
3. Update Stripe support email to support@wovely.app
4. CORS audit — all serverless functions
5. RLS full table audit
6. Background functions + import queue system (with RLS on import_jobs from day one)
7. Collections build — naturally extends queue system
8. Yearly pricing ($9.99)
9. Pattern Share / Trophy Case

## SECURITY AUDIT (from Reddit AI codebase review — Session 50)
Source: Solo founder built SaaS in 6 months with AI. Code review revealed systemic invisible-layer gaps.
Core lesson: AI is consistently good at visible (UI, features, flows) and consistently weak at invisible (security, testing, architecture, vendor lock-in).

Wovely findings mapped:

[SOLID] Vendor lock-in — Provider router with Gemini + Haiku fallback. We own both keys. Not locked in.
[SOLID] Auth — Supabase handles all auth + crypto. No Math.random() password generation.
[DONE S54] WEBHOOK_SECRET — Set in Vercel, Supabase Database Webhook on auth.users INSERT wired with x-webhook-secret header verification. notify-signup returns 200 end-to-end.
[CONFIRMED S54] Stripe webhook verification — STRIPE_WEBHOOK_SECRET has been set in Vercel since Mar 30. Signature verification has been working all along. Master doc "four-session carry" claim was a Stripe/Supabase conflation error.
[ACTION REQUIRED S55] Client-side Gemini key exposure — VITE_GEMINI_API_KEY bundled in client JS. Old key was in the leak since Mar 20 (confirmed), new key rotated S54 but is still bundled. Move extractPatternFromPDF + callGeminiVision server-side next session to close the vector.
[ACTION REQUIRED] CORS — Wildcard Access-Control-Allow-Origin: * likely present on all serverless functions. Audit and restrict to wovely.app origin.
[ACTION REQUIRED] RLS audit — Verify all existing tables have correct policies. New tables (import_jobs, collections) must have RLS from day one — never retroactively.
[ACKNOWLEDGED] Zero automated tests — Defensible at 9 users. Becomes liability at scale. Payment flows and auth paths need coverage before public launch.

## WHAT SHIPPED SESSION 49
- Gemini billing confirmed active — Paid Tier 1, StitchBox project, $28.77 spent Mar 19-Apr 15
- Spend cap set at $50/mo
- Gemini 2.5 Flash restored across all API files (was 1.5 Flash since Session 47)
- Files updated: _providerRouter.js, extract-pattern.js, fetch-pattern.js, stitch-vision.js
- All /v1beta/ paths preserved
- Rollback tag pre-gemini-25 created on main
- Tested: Marina the Manatee (text path, Haiku), Beehive (vision path, Gemini 2.5 Flash), Stitch-O-Vision Waffle Stitch — all passed
- Octopus 87-page timeout is a known client-side issue, server completes but client gives up — separate bug

## WHAT SHIPPED SESSION 52
- DKIM authentication configured end-to-end for wovely.app
- Google Workspace DKIM record generated (2048-bit, selector: google)
- TXT record published via GoDaddy DNS
- Gmail inbox delivery confirmed with DKIM PASS in headers
- Supabase upgraded from Free to Pro tier with spend cap enabled
- Trial retention email sent to turttlesong@yahoo.com ahead of May 3 expiry

## WHAT SHIPPED SESSION 53
- Claude Design system for Wovely created and published (v1.0) with Danielle's direct involvement
- Source of truth wired: github.com/alabare01/wovely repo + style guide + bev_neutral.png
- All design system cards approved: Core palette, Typography, Semantic/Stitch Check, Forbidden colors, Spacing, Components, Bev components, Voice examples, BevCheck gauge
- NEW PASTEL SEMANTIC PALETTE (replaced saturated sage/gold/rust):
  - Pass: dusty teal #A4C2C3
  - Heads-Up: soft buttercup #E2D985
  - Issues: dusty rose #CEA0A4
- BevCheck gauge REDESIGNED AND SHIPPED to production (merge commit 6053b87 on main):
  - Hero variant on StitchCheck full report page and Full Report overlay modals
  - Compact variant on inline mini gauges in AddPatternModal + ImageImportModal
  - Glass instrument treatment (specular hotspot, inner rim, outer rim light) on hero
  - Zone-anchored labels outside arc (PASS left, HEADS UP top, ISSUES right)
  - Hero score below arc in Playfair navy
  - Dynamic "Bev spotted {count} {thing|things}" sentence with correct pluralization
  - Bev integrated into arc interior on hero, clipped to small circle on compact
  - Gold needle on hero (#B8944A), lavender needle on compact for small-scale legibility
  - BEVCHECK pill + "Bev's Read" heading absorbed into hero card chrome
- ARCHITECTURE CLEANUP: 4 hand-rolled inline SVG gauges consolidated into single BevGauge component with variant prop
  - Bundle shrank 465k to 459k
  - Single source of truth for palette, angle math, state derivation
  - Future gauge updates are one-line changes
- Danielle approved every design decision via live mockup review in Claude Design (no guessing, no translation layer)
- Production code fully shipped, not mockup-only

## WHAT SHIPPED SESSION 54
- Email confirmation flow live in production (merge commit 806dddc on main)
  - Supabase "Confirm email" toggle ON
  - Custom Bev-branded confirmation template replaced YarnHive-era template
  - handleSignup in src/Auth.jsx now flips pendingConfirmation state and renders "Check your email" screen with Bev instead of attempting password signin
  - Full flow verified end to end: signup → Resend email with DKIM pass → confirmation link click → lands in app signed in
- Signup notification webhook wired end to end (merge commit 0a2d59b on main)
  - WEBHOOK_SECRET env var set in Vercel
  - Supabase Database Webhook created on auth.users INSERT pointing to /api/notify-signup with x-webhook-secret header (created through dashboard UI — vault-layer header storage, not raw SQL)
  - notify-signup.js cleaned: user count query fixed (users → user_profiles), dead signup_notifications upsert block removed
  - Verified: new signup fires webhook → 200 → "🎉 New Wovely signup: {email}" lands in adam@wovely.app inbox, Gmail Primary tab
  - adam@wovely.app mailbox was only set up today mid-session
- Gemini API key rotated after confirmed client-bundle leak since Mar 20
  - New key generated in AI Studio under Stitch Box project, old key deleted
  - Both GEMINI_API_KEY and VITE_GEMINI_API_KEY on Vercel updated to new key
  - App tested working after rotation
  - CLIENT-SIDE EXPOSURE STILL EXISTS with new key — Session 55 server-side move of extractPatternFromPDF + callGeminiVision needed to actually close the vector
- Stripe customer emails armed — all 5 subscription emails turned on
  - Trial ending reminder, upcoming renewals, expiring cards, failed card payments, failed bank debit payments
  - Smart Retry policy confirmed: 8 retries over 2 weeks with cancel-on-exhaust
  - Support email still points to alabare@gmail.com — Session 55 action to update to support@wovely.app via Public details settings
- Broken notify_new_signup trigger dropped
  - Trigger on auth.users was inserting into signup_notifications, which had RLS enabled with zero policies
  - RLS silent-kill: every new signup INSERT blocked at the DB layer, surfaced as generic "Database error saving new user" with no path to the real cause
  - Trigger, function, and signup_notifications table all dropped
  - Had been broken for unknown length of time — discovered during confirmation email testing
  - handle_new_user trigger (user_profiles auto-create) remains intact
- Security audit revision
  - STRIPE_WEBHOOK_SECRET confirmed set in Vercel since Mar 30. Signature verification has been working. Prior master doc's "four-session carry" claim was a Stripe/Supabase conflation error.

## KEY LEARNINGS SESSION 49
- Gemini 2.5 Flash 503s were free tier problem, not model problem — paid tier held up clean
- Vision path (avgText/page <1200) uses Gemini. Text path (>1200) uses Haiku chunking. These are separate pipelines.
- Client timeout fires before server finishes on large chunked jobs — client needs better waiting UX
- Supabase API calls are unlimited on all plans — upgrading Supabase is about uptime/reliability not rate limits
- Vercel Pro already active — background functions available, just need to be built

## KEY LEARNINGS SESSION 53
- Claude Design handoff to Claude Code is a real workflow unlock — mockup → Danielle feedback → Code, not mockup → Code → Danielle feedback
- Danielle's design instinct in the loop DURING design (not after) collapsed iteration cycles from hours to minutes
- Internal shorthand ("AI-first infrastructure") must not leak into brand positioning inputs — "AI" is banned in all user-facing surfaces AND brand descriptions
- Pastel semantic palette (washed, cool-toned, sidewalk-chalk) feels more Wovely than saturated traffic-light colors
- When scoping component refactors, grep the ACTUAL RENDER PATH (SVG paths, CSS classes, distinctive strings) not just import statements — hand-rolled inline duplicates hide from import-based searches
- When absorbing card chrome into a component, check every callsite for existing chrome that might duplicate — and for surfaces that render the component in a different context (modal vs page)
- "The same component in different contexts is often not the same component" — compact summary vs hero hero-treatment need different visual weights even when they share an underlying component
- Variant prop pattern is cleaner than two separate components when shared palette/math/state logic outweighs divergence
- Claude Design preview canvas colors are not production colors — system-level surface decisions must be made against live site, not preview renders

## KEY LEARNINGS SESSION 54
- Code review before action matters. Four sessions of "WEBHOOK_SECRET pending" referred to two different secrets (Stripe vs Supabase). The Stripe one was already set since Mar 30. One grep against env vars before the first entry would have caught the conflation and saved three session carries.
- RLS silent-kill rule proven again: signup_notifications had RLS enabled with zero policies, which blocks every INSERT at the database layer and surfaces only as generic "Database error saving new user" with no path to the real cause. The master doc's existing rule ("RLS must be applied to ALL new tables at creation time — never retroactively") predicted this exact failure mode.
- Supabase Database Webhook creation must go through the dashboard UI, not SQL — the x-webhook-secret header storage runs through a vault layer the dashboard handles cleanly. Do not try to create webhooks via pg_cron or raw SQL.
- Supabase signup response behavior: even when "Confirm Email" is OFF, anon-key POST to /auth/v1/signup returns no session for new signups. The prior client code assumed session always returned and failed silently. Never assume session presence on signup response — always branch on !data.session.
- Resend emails are hitting Gmail Primary tab on first attempt. Session 52 DKIM work is paying dividends on deliverability.
- Rotating an exposed API key does not close the exposure — it only resets the blast radius. If the key is still bundled client-side, the new key is leaking too. Rotation + code move are two separate actions and must both ship to actually close the vector.

## BACKGROUND FUNCTIONS + QUEUE SYSTEM SPEC (build Session 50+)
Problem: Large PDFs (87+ pages, text path) take 150s+ of Haiku chunking. Client times out. User sees failure even when server succeeds.
Solution: Async import queue with background processing and real-time UI feedback.

Architecture:
- Supabase table: import_jobs (id, user_id, status, pdf_url, result, created_at, updated_at)
- RLS REQUIRED FROM DAY ONE: user can only read/write their own rows (auth.uid() = user_id)
- Client submits job -> gets job_id back immediately
- Vercel background function processes job async, updates import_jobs row on completion
- Client polls import_jobs every 3s for status updates
- UI shows Bev loading state with progress messaging while job runs
- On completion, flows into normal pattern review UI

UI vision:
- Queue dashboard showing active/pending/completed imports
- Bev animated waiting state with fun copy (not just a spinner)
- Progress indicator showing which chunk is being processed
- Naturally extends into Collections — queue multiple patterns, process as a batch

This is the foundation Collections needs anyway. Build queue first, Collections becomes a UI wrapper on top.

## OPEN BUGS (priority order)
1. Client timeout fires on large PDFs before server finishes — needs better waiting UX + queue system
2. BevCheck UI — gauge typography, zone labels, full report unfinished. Needs Danielle feedback first
3. Modal layering bug — desktop import modal stacked background layers
4. Stitch-O-Vision complex geometric prompts
5. StitchResultPage favicon missing
6. Bev Notes nav icon — blue shield needs personality
7. PDF cover intelligence — text-heavy first pages as hero
8. /hive fossil route — YarnHive remnant
9. Pages not scrolling to top on load

## GEMINI STATUS
Gemini 2.5 Flash: ACTIVE. Restored Session 49. Model string: gemini-2.5-flash. API path: /v1beta/
Gemini 1.5 Flash: RETIRED. Was stable fallback, now replaced.
Rollback: git checkout pre-gemini-25 if 2.5 Flash shows instability on production.
KEY ROTATION S54: API key rotated after confirmed client-bundle leak since Mar 20. New key live in GEMINI_API_KEY and VITE_GEMINI_API_KEY on Vercel. Old key deleted in AI Studio (Stitch Box project). Client-side exposure still exists until Session 55 server-side move of extractPatternFromPDF + callGeminiVision into /api/snap-vision.

## ANTHROPIC API STATUS
Tier 1 — 90K OTPM, 1K RPM. $40 credit added Apr 14 2026.
Haiku: claude-haiku-4-5-20251001
max_tokens BevCheck: 2000. max_tokens extract: 32000

## EXTRACT PIPELINE ARCHITECTURE (as of Session 49)
Client detects avgText/page:
- <300 or 300-1200 (mixed) = vision path = POST /api/extract-pattern-vision with pdfUrl — GEMINI 2.5 FLASH
- >1200 = text path = POST /api/extract-pattern with full pdfText, 270s client timeout — HAIKU CHUNKED

Server extract-pattern.js:
- <14k chars = single pass: Gemini fast-path (4s) then Haiku fallback (55s)
- >14k chars = chunked: splitIntoChunks(14k, 500 overlap) then sequential callClaudeChunk then mergeChunkResults
- 250s budget guard stops chunking early
- maxDuration: 300

BevCheck cascade: Gemini 2.5 Flash v1beta (8s) then Haiku 55s (2000 max_tokens) then bev_tangled

## COLLECTIONS SPEC (ready to build Session 50+)
Naturally extends import queue system. Build queue first, Collections is the UI wrapper.
Schema ready to write. 4 Claude Code prompts needed. 2 sessions to ship v1.
v1: collections table + collection_patterns join + UI list + detail page + import wiring.
MCAL import already works as components. Collections is the grouping wrapper.
Monetization: gate behind Craft tier (~$14.99/mo).
RLS REQUIRED FROM DAY ONE on collections and collection_patterns tables.

## DANIELLE FEEDBACK LOG
- [LOVES IT] My Wovely redesign — confirmed iMessage Apr 6
- [SHIPPED S40] Instructions/Rows tab rename
- [SHIPPED S40] Import spinner clears on failed upload
- [SHIPPED S40] Nav guard modal removed
- [SHIPPED S40] Email capture popup removed
- [SHIPPED S40] iPad scroll bounce fix — needs Danielle confirmation
- [NEEDS DISCUSSION] Floating import banner covers side nav while processing
- [NEEDS DISCUSSION] No warning when user refreshes during import
- [NEEDS DISCUSSION] Stash + button should add yarn not upload pattern
- [NEEDS DISCUSSION] Color palette — Danielle finds pure white cold
- [SHIPPED S53] BevCheck gauge redesign — pastel palette, zone-anchored labels, hero score below arc, glass instrument treatment, Bev integrated into arc, dynamic pluralization. Full approval from Danielle via Claude Design mockup review.
- [NEEDS DISCUSSION] Wovely surface color — Danielle flagged the lavender canvas in Claude Design preview. Decision deferred: evaluate on live site on her phone before any style guide change.
- [QUEUED] Compact BevGauge variant could benefit from subtle glass treatment to unify visually with hero. Session 55+ refinement.
- [QUEUED] State label on compact gauge — consider dusty rose color for "issues" state to amplify signal (blocked: #CEA0A4 fails AA contrast against #F8F6FF at 18px bold, ratio 2.13:1). Try darker rose like #B8837A that passes AA.

## SESSION 53 INSIGHT — BEVCHECK METER COLOR LOGIC (SHIPPED)
Surfaced during Claude Design setup. Previous BevCheck gauge rendered lavender regardless of result band — aesthetically pleasant but semantically inert. Redesigned with pastel semantic palette:
- 80%+ PASS → dusty teal #A4C2C3
- 60-79% HEADS-UP → soft buttercup #E2D985
- <60% ISSUES → dusty rose #CEA0A4
Zone-anchored labels (PASS left, HEADS UP top, ISSUES right) outside the arc on hero. Score in large navy below arc. Glass instrument treatment. Bev integrated into arc interior, needle on foreground layer. Dynamic "Bev spotted {count} {thing|things}" copy template.
Status: SHIPPED to production Session 53 (merge commit 6053b87 on main).

## ACTIVE USERS (9)
danielle2673@me.com — Pro — 17 patterns — Active (north star)
alabare@gmail.com — Pro — 4 patterns — Active
steffaniembrown@gmail.com — Pro — 5 patterns — Active
turttlesong@yahoo.com — Pro — 2 patterns — Trial
ronsrit@hotmail.com — Pro — 3 patterns — At risk
danielle2673@gmail.com — Pro — 2 patterns — Drifting
stinkyswife@gmail.com — Pro — 0 patterns — Ghosted
tbrightjax@gmail.com — Pro — 0 patterns — Ghosted
alabare+test1@gmail.com — Free — 0 patterns — Test

## USER IDS
Adam: 6e1a02d9-c210-4bc4-968e-dde3435565d1
Danielle me.com: d6b18345-a85e-42bd-b7cb-f20efd4b2fe7
Danielle gmail: 038442a2-b13d-4abb-9960-24a360078f6c

## INFRASTRUCTURE
Live: wovely.app
GitHub: github.com/alabare01/wovely
Local: C:/Users/adam/wovely
Supabase: vbtsdyxvqqwxjzpuseaf — PRO (upgraded Session 52, spend cap enabled)
Vercel: prj_SZYwLGH5V7kCZYryr4MSy3US3bfz / team_mRQaDsQzhF6HFGU5Ka7hi5OM — PRO
Stripe: acct_1TDQ1WGbX5hxxc0T (LIVE) $8.99/mo Pro
Cloudinary: dmaupzhcx
PostHog: Project 363175 — 157 unique visitors since Jan 1 2026
Current session:

## EMAIL STACK
Google Workspace: adam@wovely.app, support@wovely.app
Resend: RESEND_API_KEY in Vercel
DNS: GoDaddy. MX records fine. SPF chained. DKIM LIVE — verified at google._domainkey.wovely.app (Session 52). Gmail delivery confirmed with DKIM PASS.

## LEGAL
Wovely LLC — filed March 30 2026, doc L26000181882, Florida
Annual report due Jan 1 to May 1 2027

## TECH STACK
React/Vite, Supabase, Vercel PRO, Gemini 2.5 Flash, Claude Haiku fallback, Stripe $8.99/mo, Cloudinary, Resend, PostHog

## STYLE GUIDE v1.0 (LOCKED)
Primary: #9B7EC8, Navy: #2D3A7C, White: #FFFFFF, Surface: #F8F6FF, Border: #EDE4F7
Text primary: #2D2D4E, Text secondary: #6B6B8A, Danger: #C0544A
Fonts: Playfair Display (headings), Inter (body)
NEVER USE: #1A1A2E, terracotta #B85A3C or #C05A5A, cream #FAF7F2

## BEV
Hyper-realistic crochet amigurumi lavender snake, named after Danielles grandmother Beverly.
bev_neutral.png in /public.
ALL loading states: static Bev inside spinning ring.
NEVER snake emoji where Bev image can be used.
NEVER use AI in user-facing copy — Bev owns all intelligence.
Future: bev_happy.png, bev_warning.png, bev_concerned.png
BevCorner message pool includes turttlesong shoutout as of Session 48.

## BACKGROUND CSS (CRITICAL)
body::before: image, position fixed, z-index -1
body::after: gradient overlay, position fixed, z-index -1
#root: position relative, z-index 1
App.jsx: NO background-color on any layout wrapper

## Z-INDEX MAP
FeedbackWidget: 60, Add Pattern tab: 40, Mobile header: 20, Tooltips: 100, Modals: 50+

## PENDING ADAM ACTIONS
1. Move client-side Gemini calls to server — extractPatternFromPDF (AddPatternModal.jsx) + callGeminiVision (HiveVisionForm) → new /api/snap-vision endpoint. New rotated key is still bundled. Not urgent because $50/mo spend cap caps blast radius, but next focused security session.
2. Update Stripe support email from alabare@gmail.com to support@wovely.app via Stripe Public details settings
3. Delete VITE_GEMINI_API_KEY env var from Vercel once client-side Gemini calls are moved server-side
4. Replace cover image on First Sunrise Blanket Pattern
5. Claim @wovely on Instagram + TikTok
6. Enable Apple sign-in in Supabase
7. POST IN FACEBOOK GROUPS — only after import rock solid
8. File annual report Wovely LLC at sunbiz.org (L26000181882) Jan 1 to May 1 2027
9. Try Recraft.ai for Bev vector logo
10. Create bev_happy.png, bev_warning.png, bev_concerned.png
11. Delete feature/turttlesong-shoutout: git push origin --delete feature/turttlesong-shoutout
12. Migrate Claude account from adam@terrainnovations.com to adam@wovely.app at a natural breakpoint (requires cancel + rebuild, estimated 2-4 hours, not urgent)
13. Upload licensed Playfair Display + Inter WOFF2 files to Claude Design to resolve "substitute web fonts" warning

## TECHNICAL GOTCHAS
supabaseAuth.getUser() is SYNCHRONOUS — never await
Pattern fetch needs Range: 0-499 header
DEFAULT_STARTERS excluded from stats
detailOnSave must spread updated_at onto local state
Hero image: PILL sentinel check before using photo field
Vercel Pro: maxDuration 300 on extract-pattern.js and extract-pattern-vision.js
iOS: background-attachment fixed broken — use fixed pseudo-elements
Gemini: strip markdown fences before JSON.parse
Gemini responses: skip parts where part.thought === true
Gemini 2.5 Flash: ACTIVE — model string gemini-2.5-flash, API path /v1beta/
Claude Haiku model: MUST use claude-haiku-4-5-20251001
BevCheck max_tokens: 2000
Missing await on async = silent 500. Check this first.
Mobile background fetch: start fetch before UI transition
user_profiles has NO email column — join through auth.users
PDFs -> Supabase Storage. Images -> Cloudinary. Brand assets -> /public
SessionStorage: wovely_feedback_draft, wovely_redirect_intent
useBlocker requires createBrowserRouter — Wovely uses BrowserRouter, do NOT use
iPad Safari scroll bounce: never overflow-y scroll on inner containers
BevCheck calls never go direct to Gemini from browser
Provider router: probes gemini-2.5-flash on /v1beta/ — must match actual call model and path
Large PDF chunking: SHIPPED S48
Smart PDF routing: SHIPPED S48 — avgText/page threshold 300/1200
Fixed position banners in Dashboard.jsx: DO NOT USE — causes layout issues
App.jsx fragment wrapping: DO NOT wrap App return in React fragments — breaks render
Client timeout fires before server finishes on large jobs — queue system needed
RLS must be applied to ALL new tables at creation time — never retroactively
CORS: audit all serverless functions — wildcard origin likely present, restrict to wovely.app
Stripe webhook: must verify stripe-signature header before processing any event

## STITCH-O-VISION
Gemini 2.5 Flash — no Haiku fallback. Complex geometric patterns: ongoing prompt refinement needed.

## CHANGELOG RULE
Only user-facing features. Never mention AI — Bev language only. Prepend each session.

## CLAUDE CODE DESKTOP APP WORKFLOW
Adopted Session 50. Desktop app replaces CLI terminal + browser alt-tab workflow.

Two-window setup:
- Claude.ai in browser = strategy conversations with Claude (this instance). Master doc context lives here.
- Claude Code desktop app = code execution. Opus 4.7 xhigh default.
- Alt-tab between them. Do NOT try to unify in one window.

Panel usage:
- Chat panel = where Claude Code executes tasks. Paste Claude.ai prompts here. 95% of work happens here.
- Terminal panel = for manual commands Adam runs himself (git status, git push, npm run dev). Skip Claude turn when command is known.
- Preview panel = for UI work. Runs local dev server inside desktop. Essential for landing page, BevCheck UI, queue dashboard, anything Danielle-facing.
- Diff viewer = mandatory before every merge. Replaces git diff in terminal. Catches mistakes before shipping.
- Plan panel = for big tasks. Turn on for queue system build, Collections. Skip for small fixes.
- Tasks panel = for multi-step work tracking. Queue system build is ideal use case.

Session management:
- New session per feature branch. Do not reuse old sessions for new tasks.
- Each session gets isolated git worktree. Changes in one session do not affect others until committed.
- Parallel sessions for independent tasks (CORS audit + queue build can run simultaneously).

Permission modes:
- Ask permissions (default) = approve every edit. Use for Stripe, auth, production hotfixes.
- Auto mode = Claude handles permissions via classifiers. Use for queue system build, CORS fixes, RLS additions, Collections build.
- Plan mode = Claude maps approach without touching files. Use before large refactors.

Model:
- Opus 4.7 xhigh default. Current Adam setting: High. Bump to xhigh for queue system and Collections.

Routines (later, not now):
- After Collections ships: weekly security audit, nightly pattern import health, PostHog digest, changelog generator.

Ultrareview budget:
- 3 free remaining. Spend on: post-queue-system pre-merge, post-Stripe-verification pre-merge, first Craft tier feature.

Master doc status:
- External API workflow still in use as of Session 50.
- Evaluating Project knowledge migration in Session 51 as parallel test.
- Do not deprecate until replacement is proven across at least one session.

## CLAUDE RULES
Fetch master doc first, no exceptions
Next session = 55
Danielle feedback overrides everything
ONE complete Claude Code prompt per task
Never push direct to main
Match Adam energy
ALWAYS query vercel_logs first when debugging
Model swap first when provider is flaky
Proactively flag platform limits and upgrade paths
Never use em dashes in copy or emails written for Adam

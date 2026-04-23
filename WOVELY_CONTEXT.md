# Wovely Project Context

Single source of truth for Wovely project context. Both Claude.ai and Claude Code read this file at session start.

Last updated: Session 59 close, 2026-04-22

---

# WOVELY MASTER DOC v100

## SESSION CLOSE WORKFLOW (adopted Session 59)
Claude.ai writes the updated doc as plain text in chat at session close. Adam copies it into C:\Users\adam\wovely\WOVELY_CONTEXT.md and saves. No Claude Code prompt required at close.

Claude Code pushes to GitHub opportunistically — next time Adam is in Claude Code for any reason, one-line instruction at the top: "also commit WOVELY_CONTEXT.md to main." Zero logic, zero avalanche risk.

Session open workflow unchanged: Claude.ai fetches from GitHub raw URL. If GitHub is behind local, Adam pastes current local content into chat at session open and Claude treats that as canonical for the session.

## CURRENT PRODUCTION STATE
Live on wovely.app. Session 59 merged test/claude-primary-vision to main — vision pipeline now Haiku-primary with Gemini fallback, reasoning-first prompt schema, hard IF/THEN rejection rules. Production deployment dpl_DuZ4LiY276sHbDfiYBaC7y1LYk9L confirmed READY.

Supabase still free tier. DKIM still missing. WEBHOOK_SECRET not yet set.

## FIRST THING SESSION 60 (in order)
1. Founder dashboard artifact — live React artifact pulling Supabase + PostHog. Three scope questions pending.
2. Collections build — turttlesong trial expires May 3. Blocks retention.
3. Welcome re-engagement email send (script built Session 56, not yet sent).

## SESSION 60 PRIORITY ORDER
1. Founder dashboard artifact
2. Collections build (queue system foundation first)
3. Welcome re-engagement email send
4. DKIM email fix
5. Supabase Pro upgrade ($25/mo, GoGno.me org)
6. WEBHOOK_SECRET env var + Stripe signature verification
7. CORS audit — all serverless functions
8. RLS full table audit
9. BevCheck UI polish — needs Danielle written feedback first
10. notify-signup.js wiring
11. Yearly pricing ($9.99)
12. Pattern Share / Trophy Case
13. Stitch Library build (post-Collections)

## WHAT SHIPPED SESSION 59
- Master doc workflow overhauled: local-first, opportunistic GitHub push. Eliminates session-close ceremony failure.
- Master doc reconciled to v100 with full drift capture (Sessions 52-58 previously undocumented in GitHub).
- Stitch Library spec captured from Danielle's Session 58 proposal.
- test/claude-primary-vision merged to main after controlled gated merge:
  - Rebased 5 commits onto main cleanly (zero doc conflicts)
  - Mandalorian 9-image pattern extraction verified on mobile preview
  - Second pattern import verified
  - Fast-forward merge to main, deployed to production, branch deleted
  - Vision pipeline now Haiku-primary, Gemini fallback
- Key learning: controlled merge workflow with human gates and rebase-over-merge prevents drama on complex state.

## SESSION 57/58 SUMMARY (merged session, reconciled in 59)
Goal: Fix Stitch-O-Vision overcorrection on Mandalorian 9-image pattern.

What shipped on branch (now merged to main):
- Reasoning-first prompt schema — model outputs observation_notes and candidate_analysis BEFORE classification
- Hard IF/THEN rejection rules replacing soft guidance
- Architectural swap: Claude-primary vision pipeline (Haiku first, Gemini fallback)

Verified Session 59:
- Pattern extraction works: 62s server-side on Mandalorian, structured output, 8 components, 65 rows
- The 55s client timeout was the actual bug blocking original failure mode
- Timeout raised to 240s client and server

Known issues live on main (accepted at merge):
1. Rule A overcorrection — prompt biases toward linen stitch on textured fabrics. Two dc test images misclassified as linen stitch in chevron arrangement. Prompt iteration has hit diminishing returns without ground-truth data. Fix path: Stitch Library.
2. No front-post / back-post stitch awareness (FPdc, BPdc, Alpine, Suzette, waffle, herringbone invisible to classification). Fix path: Stitch Library.

## STITCH LIBRARY (proposed Session 58 by Danielle)
Summary: Curated, bounded library of core crochet stitch techniques, pattern arrangements, and construction methods. Source of truth for Stitch-O-Vision matching, BevCheck validation, Ask Bev, and pattern extraction normalization.

Origin: Danielle's observation — "there are only so many stitch types in crochet, why not pull them all together as a resource to compare against?" Reframes Stitch-O-Vision from unbounded generation into bounded retrieval + matching.

Strategic value:
- Fixes Rule A overcorrection root cause (unbounded generation against training priors)
- Makes "also known as," tutorial links, Bev descriptions authoritative instead of per-request guesses
- Every entry becomes /stitches/[slug] SEO landing page
- Backbone of future Ask Bev (bounded Q&A)
- Makes BevCheck smarter, makes pattern extraction normalize stitch naming
- Proprietary curated content = real competitive moat

Scope:
- 60-120 core stitch techniques = 95% of Facebook group uploads
- 8-12 pattern arrangements
- 10-15 construction methods
- Total ~150 entries for MVP

Proposed schema (Supabase stitch_library):
- id (uuid), slug, primary_name, also_known_as (text[])
- dimension ("stitch_technique" | "pattern_arrangement" | "construction_method")
- difficulty, description, visual_cues (text[]), rejection_cues (text[])
- common_uses, tutorial_url, reference_image_urls (text[])
- created_by (defaults Danielle)

Phases:
- Phase 1 (post-Collections): Seed top 30 stitches. Admin UI for Danielle. ~3 hours authoring.
- Phase 2: Rewrite Stitch-O-Vision as two-step observe-then-match.
- Phase 3: Ship /stitches/[slug] pages.

Sequencing: Waits behind Collections. turttlesong trial May 3 = Collections priority.

## WHAT SHIPPED SESSIONS 52-56
Sessions 52-55: Anonymous mode fully built and merged. AuthWallModal, gateAction helper with anonymous-first → auth-wall → Pro-paywall hierarchy, session hydration retry logic.
Session 56: Facebook launch executed. PostHog showed strong traffic with meaningful anonymous mode + auth wall engagement. Database cleanup (test accounts removed). Welcome re-engagement email script built (dry-run/test/send modes, per-user magic links, three recipient segments) but PARKED, not yet sent.

## SECURITY AUDIT (from Session 50 Reddit review)
[SOLID] Vendor lock-in — Provider router with Gemini + Haiku fallback. Own both keys.
[SOLID] Auth — Supabase handles all auth + crypto.
[ACTION REQUIRED] WEBHOOK_SECRET — not set. Without it, Stripe signatures unverified. Fix FIRST.
[ACTION REQUIRED] CORS — Wildcard likely present on all serverless functions. Restrict to wovely.app origin.
[ACTION REQUIRED] RLS audit — Verify all existing tables. New tables must have RLS from day one.
[ACTION REQUIRED] Stripe webhook verification — Confirm checkout.session.completed verifies stripe-signature header.
[ACKNOWLEDGED] Zero automated tests — Defensible at 9 users. Liability at scale.

## BACKGROUND FUNCTIONS + QUEUE SYSTEM SPEC
Problem: Large PDFs take 150s+ of Haiku chunking. Client times out, user sees failure when server succeeds.

Solution: Async import queue with background processing.

Architecture:
- Supabase table: import_jobs (id, user_id, status, pdf_url, result, created_at, updated_at)
- RLS REQUIRED FROM DAY ONE: auth.uid() = user_id
- Client submits → gets job_id immediately
- Vercel background function processes async, updates row on completion
- Client polls import_jobs every 3s
- UI: Bev loading state with progress
- On completion, flows into normal pattern review UI

This is the foundation Collections needs. Build queue first, Collections becomes UI wrapper.

## COLLECTIONS SPEC
Extends import queue. Schema ready. 4 Claude Code prompts. 2 sessions to ship v1.
v1: collections table + collection_patterns join + UI list + detail page + import wiring.
MCAL import already works. Collections is grouping wrapper.
Monetization: gate behind Craft tier (~$14.99/mo).
RLS from day one on collections and collection_patterns.

## OPEN BUGS (priority order)
1. Client timeout on very large PDFs before server finishes — queue system needed
2. Rule A overcorrection on Stitch-O-Vision (fix via Stitch Library)
3. BevCheck UI — gauge typography, zone labels, full report unfinished. Needs Danielle feedback
4. Modal layering bug — desktop import modal stacked background layers
5. Stitch-O-Vision complex geometric prompts
6. StitchResultPage favicon missing
7. Bev Notes nav icon — blue shield needs personality
8. PDF cover intelligence — text-heavy first pages as hero
9. /hive fossil route — YarnHive remnant
10. Pages not scrolling to top on load
11. Gemini client-side calls in AddPatternModal.jsx and HiveVisionForm still need to move server-side via /api/snap-vision

## GEMINI STATUS
Gemini 2.5 Flash: ACTIVE as fallback. Model string: gemini-2.5-flash. API path: /v1beta/
Rollback tag: pre-gemini-25 on main.
API key rotated Session 54.

## ANTHROPIC API STATUS
Tier 1 — 90K OTPM, 1K RPM. $40 credit added Apr 14 2026.
Haiku: claude-haiku-4-5-20251001
max_tokens BevCheck: 2000. max_tokens extract: 32000

## EXTRACT PIPELINE ARCHITECTURE (post-Session 59 merge)
Client detects avgText/page:
- <300 or 300-1200 (mixed) = vision path = POST /api/extract-pattern-vision with pdfUrl — HAIKU PRIMARY, GEMINI FALLBACK
- >1200 = text path = POST /api/extract-pattern with full pdfText, 240s client timeout — HAIKU CHUNKED

Server extract-pattern.js:
- <14k chars = single pass
- >14k chars = chunked with 500 overlap, sequential, 240s budget guard, maxDuration 300

BevCheck cascade: Gemini 2.5 Flash v1beta (8s) → Haiku 55s (2000 max_tokens) → bev_tangled
BevCheck still Gemini-primary (not swapped in Session 59 merge).

## DANIELLE FEEDBACK LOG
- [LOVES IT] My Wovely redesign — confirmed iMessage Apr 6
- [SHIPPED S40] Instructions/Rows tab rename, import spinner, nav guard removed, email capture removed, iPad scroll fix
- [NEEDS DISCUSSION] BevCheck full report UI — get written feedback
- [NEEDS DISCUSSION] Stitch Check — link to error location in pattern
- [NEEDS DISCUSSION] Floating import banner covers side nav while processing
- [NEEDS DISCUSSION] No warning when user refreshes during import
- [NEEDS DISCUSSION] Stash + button should add yarn not upload pattern
- [NEEDS DISCUSSION] Color palette — Danielle finds pure white cold
- [S58 PROPOSAL] Stitch Library (see full spec above)
- [PENDING REVIEW] Rule A overcorrection — two dc patterns misclassified as linen stitch

## KEY USERS (strategic only)
Danielle (me.com) — north star, UX veto, 17 patterns
Danielle (gmail) — second account
Adam — founder
Steffanie Brown — engaged Pro, champion candidate
turttlesong — trial, expires May 3, retention priority

For current user count and activity, query Supabase live or PostHog.

## USER IDS
Adam: 6e1a02d9-c210-4bc4-968e-dde3435565d1
Danielle me.com: d6b18345-a85e-42bd-b7cb-f20efd4b2fe7
Danielle gmail: 038442a2-b13d-4abb-9960-24a360078f6c

## INFRASTRUCTURE
Live: wovely.app
GitHub: github.com/alabare01/wovely
Local: C:/Users/adam/wovely
Supabase: vbtsdyxvqqwxjzpuseaf — FREE TIER (upgrade pending)
Vercel: prj_SZYwLGH5V7kCZYryr4MSy3US3bfz / team_mRQaDsQzhF6HFGU5Ka7hi5OM — PRO
Stripe: acct_1TDQ1WGbX5hxxc0T (LIVE) $8.99/mo Pro
Cloudinary: dmaupzhcx
PostHog: Project 363175
Current session: 60 (next)

## EMAIL STACK
Google Workspace: adam@wovely.app, support@wovely.app
Resend: RESEND_API_KEY in Vercel
DNS: GoDaddy. MX records fine. SPF chained. DKIM MISSING.

## LEGAL
Wovely LLC — filed March 30 2026, doc L26000181882, Florida
Annual report due Jan 1 to May 1 2027

## TECH STACK
React/Vite, Supabase, Vercel PRO, Claude Haiku 4.5 primary (vision + text extract), Gemini 2.5 Flash fallback + BevCheck primary, Stripe $8.99/mo, Cloudinary, Resend, PostHog

## STYLE GUIDE v1.0 (LOCKED)
Primary: #9B7EC8, Navy: #2D3A7C, White: #FFFFFF, Surface: #F8F6FF, Border: #EDE4F7
Text primary: #2D2D4E, Text secondary: #6B6B8A, Danger: #C0544A
Fonts: Playfair Display (headings), Inter (body)
NEVER USE: #1A1A2E, terracotta #B85A3C or #C05A5A, cream #FAF7F2

## BEV
Hyper-realistic crochet amigurumi lavender snake, named after Danielle's grandmother Beverly.
Canonical reference: IMG_3968 (no text, navy hexagon frame). Character bible locked Session 19.
bev_neutral.png in /public.
ALL loading states: static Bev inside spinning ring.
NEVER snake emoji where Bev image can be used.
NEVER use "AI" in user-facing copy — Bev owns all intelligence.
Future assets: bev_happy.png, bev_warning.png, bev_concerned.png
Named AI suite: Stitch-O-Vision, BevCheck, Ask Bev (future).

## BACKGROUND CSS (CRITICAL)
body::before: image, position fixed, z-index -1
body::after: gradient overlay, position fixed, z-index -1
#root: position relative, z-index 1
App.jsx: NO background-color on any layout wrapper

## Z-INDEX MAP
FeedbackWidget: 60, Add Pattern tab: 40, Mobile header: 20, Tooltips: 100, Modals: 50+

## PENDING ADAM ACTIONS
1. Fix Google Workspace DKIM
2. Upgrade Supabase Free → Pro (GoGno.me org)
3. Add WEBHOOK_SECRET env var to Vercel — CRITICAL
4. Supabase webhook: auth.users INSERT → https://wovely.app/api/notify-signup
5. Replace cover image on First Sunrise Blanket Pattern
6. Claim @wovely on Instagram + TikTok
7. File annual report Wovely LLC at sunbiz.org (L26000181882) Jan 1 to May 1 2027
8. Try Recraft.ai for Bev vector logo
9. Create bev_happy.png, bev_warning.png, bev_concerned.png
10. Get Danielle written feedback on BevCheck full report UI
11. Send welcome re-engagement email (script built Session 56, not yet sent)
12. Commit WOVELY_CONTEXT.md to main opportunistically (next time in Claude Code)

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
Claude Haiku model: MUST use claude-haiku-4-5-20251001
BevCheck max_tokens: 2000
Missing await on async = silent 500. Check this first.
Mobile background fetch: start fetch before UI transition
user_profiles has NO email column — join through auth.users
Auth schema FK relationships not reliably discoverable via information_schema — use pg_constraint joined to pg_class/pg_namespace with pg_get_constraintdef() for CASCADE discovery
RLS with zero policies silently blocks all writes — no error surfaced
Supabase signup returns sessions in two shapes (nested or flat) — normalization required
Vercel env var changes require fresh deployment
Client-side API keys bundled in Vite are exposed — remaining client-side Gemini calls must move server-side
PDFs → Supabase Storage. Images → Cloudinary. Brand assets → /public
SessionStorage: wovely_feedback_draft, wovely_redirect_intent
useBlocker requires createBrowserRouter — Wovely uses BrowserRouter, do NOT use
iPad Safari scroll bounce: never overflow-y scroll on inner containers
BevCheck calls never go direct to Gemini from browser
Provider router: probes gemini-2.5-flash on /v1beta/ — must match actual call model and path
Fixed position banners in Dashboard.jsx: DO NOT USE
App.jsx fragment wrapping: DO NOT wrap App return in React fragments
Client timeout: raised to 240s in Session 58
RLS must be applied to ALL new tables at creation
CORS: audit all serverless functions
Stripe webhook env var: STRIPE_WEBHOOK_SECRET (not WEBHOOK_SECRET)
Stitch-O-Vision: Haiku-primary on main as of Session 59 merge
BevCheck events still named stitch_check_run in PostHog from pre-rename
PostHog production traffic filter: properties.$current_url LIKE '%wovely.app%'
Vercel runtime logs truncate at first console.log — use vercel_logs Supabase table for full error strings
Supabase execute_sql requires auth.users with explicit schema prefix

## STITCH-O-VISION (post-Session 59)
Vision pipeline: Haiku primary (claude-haiku-4-5-20251001) → Gemini 2.5 Flash fallback
Reasoning-first prompt schema: observation_notes → candidate_analysis → classification
Hard IF/THEN rejection rules in prompt
Known issue: Rule A overcorrection on textured fabrics, no front-post/back-post awareness
Fix path: Stitch Library (post-Collections)

## CHANGELOG RULE
Only user-facing features. Never mention AI — Bev language only. Prepend each session.

## FOUNDER DASHBOARD (Session 60 queued)
Live React artifact pulling Supabase + PostHog. Three scope questions pending:
1. Which metrics matter day-to-day (total users, Pro/free, new signups, patterns created, turttlesong trial countdown, Danielle activity, PostHog top events)
2. Supabase anon key source
3. Usage frequency (weekly → artifact fine; daily → skip to in-app /founder route)

Path forward: artifact as v1, migrate to in-app /founder route post-Collections.

## CLAUDE CODE DESKTOP APP WORKFLOW
Two-window setup: Claude.ai browser = strategy. Claude Code desktop = execution.
New session per feature branch. Isolated git worktrees. Parallel sessions for independent tasks.
Permission modes: Ask (Stripe/auth/hotfixes), Auto (queue system/CORS/RLS/Collections), Plan (before large refactors).
Model: Opus 4.7 xhigh default.

## CLAUDE RULES
Fetch master doc first, no exceptions (local or GitHub raw URL)
Next session = 60
Danielle feedback overrides everything
ONE complete Claude Code prompt per task
Never push direct to main (except WOVELY_CONTEXT.md)
Match Adam energy
ALWAYS query vercel_logs first when debugging
Model swap first when provider is flaky
Proactively flag platform limits and upgrade paths
Never use em dashes in copy or emails written for Adam
Session close: plain text doc in chat, Adam saves locally, GitHub push opportunistic
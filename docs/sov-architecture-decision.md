# SOV Architecture Decision — Session 62 → Future

**Status:** PARKED as of Session 63 (May 2, 2026)
**Decision required by:** When Queue System and Collections ship, or when a clear architecture path emerges
**Owner:** Adam
**Branch state:** `feat/sov-library-integration` pushed but NOT merged. Do not merge.

## Context

Session 62 shipped the Stitch Library data layer (307 entries, Cloudinary-backed, RLS-gated, candidate capture wired). The vision layer that sits on top of it failed validation under cropped-swatch testing.

Root cause: the shipped architecture sends text descriptions of 307 stitches to a vision model and asks it to identify what's in the user's image. The model was reading text labels embedded in our reference images (page headers, stitch names in red type, prose descriptions from the source PDFs) and pattern-matching against the prompt. With clean swatch images that contain no text, accuracy collapsed to 1/10.

This is not a prompt problem. It is an architecture problem. Text-only prompting of a vision model is not visual identification.

## What's salvageable

- Supabase `stitch_library` table (307 entries, schema correct)
- Supabase `stitch_library_candidates` table and capture flow
- All 307 reference images uploaded to Cloudinary at `stitch-library/<slug>.png`
- PostHog event instrumentation (sov_scan_started, sov_scan_matched, sov_scan_no_match, sov_scan_failed)
- RLS policies and admin gating
- Honest-UNSURE pathway enforcement at the model layer
- The principle: "either library content or honest unsure"

None of this needs to be rebuilt. The vision matching layer is the only piece being replaced.

## What's wrong and must change

The single requirement for any future architecture: **the vision model must compare the user's upload against actual visual data from the library, not against text descriptions of the library.**

## Future UX direction (locked Session 63)

Scan-for-a-match. Single verdict, not a ranked list. Bev returns one stitch identification with confidence, or honest UNSURE. This shapes threshold tuning when re-architecture happens.

## Options on the table

### Option 1 — Embedding-based visual search (RECOMMENDED)

Pre-compute visual embeddings for all 307 reference images using a vision embedding model (CLIP, Cohere multimodal, or similar). Store embeddings in Supabase as vector column. User upload computes its own embedding at scan time. Nearest-neighbor lookup returns top match plus confidence score.

**Pros:** Cheaper per scan than vision-model calls. Faster. Mathematically grounded in visual similarity, not text. Scales to 1000+ stitches without prompt-size limits. Industry-standard approach for image retrieval.

**Cons:** Real engineering work, 2-4 sessions. Requires Supabase pgvector extension. Reference images need cleanup first — text labels in source images will pollute embeddings the same way they polluted the prompt. Embedding model selection is its own decision.

**Open question that needs to be answered before this is built:** clean swatch reference images vs. annotated page screenshots. May require a Dani photo session for canonical swatches, or aggressive cropping of existing images.

### Option 2 — Two-stage pipeline

First pass: text-based narrowing to top 5-10 candidates (current architecture, used as a filter not a verdict). Second pass: send user image plus the 5-10 candidate reference images to a vision model for visual comparison.

**Pros:** Builds on current code. Preserves library-grounded selection. Genuinely uses vision capability for the final match.

**Cons:** 5-10x more expensive per scan. Slower. Still vulnerable to text-label pollution on the reference images we send in stage two unless those are also cleaned up. Doesn't scale as cleanly past 500-1000 stitches.

### Option 3 — Park SOV indefinitely (CURRENT STATE)

Stay offline in production. Queue System and Collections take priority. Revisit when those ship.

**Pros:** Zero ongoing cost. Unblocks critical path features. Lets Dani's review work resume on its own track without being SOV-gated.

**Cons:** SOV is the demo feature. Long-term parking risks it becoming a ghost. Every session it stays parked is a session it competes with new priorities for re-attention.

### Option 4 — Ship as-is with lowered expectations

Accept that 80%+ of scans return UNSURE. Frame as "slow learning system" — candidate queue grows the verified library over time as users hit gaps. Lean into the honest-failure pathway as the feature's character.

**Pros:** Ships now. Reuses existing architecture. Honest with users.

**Cons:** Demo experience is bad. Most marketing screenshots would be UNSURE results. Hard to justify Pro tier value if the headline AI feature mostly says "I don't know." Damages trust in Bev's voice if her flagship capability is shrugging.

## Recommendation

**Park (Option 3) until Queue System and Collections ship. Then build Option 1.**

Rationale:

1. Queue System is the foundation for every future async feature including the SOV rebuild itself. Embedding generation and nearest-neighbor lookup will likely run through the queue when SOV comes back.
2. Option 1 is the right architecture and a known pattern. Doing it after Queue System exists means we can build it correctly the first time, on top of infrastructure we already trust.
3. Collections is the higher-revenue feature. Craft tier monetization waits on it.
4. The cropped-swatch failure was caught in testing on a branch. The system worked. No production users were exposed to confidently-wrong matches. There is no fire.

## Trigger conditions to un-park

Any of:

- Queue System and Collections both shipped to production
- Dani requests SOV come back online (overrides all other priorities)
- A user willing to pay specifically for SOV emerges and validates the demand
- Adam has a clean swatch photo session with Dani that produces canonical reference images, making Option 1 cheaper to execute
- Six weeks elapsed without un-park, prompting an explicit re-decision (don't let it ghost)

## Open questions to resolve before un-parking

1. Image-only vs image-plus-context capture flow — does the user upload just a swatch photo, or photo plus optional metadata (yarn weight, hook size, project type)? Captured-context could narrow the embedding search space.
2. Reference image quality — are the existing 307 PDF screenshots good enough as embedding source material, or do we need clean swatch shots? Probably need at least a sampling test before committing.
3. Embedding model selection — CLIP, Cohere, OpenAI, or in-house. Cost and accuracy tradeoffs per scan.
4. Threshold tuning — what nearest-neighbor distance counts as a confident match vs. UNSURE? Will require a labeled validation set.
5. What happens to `feat/sov-library-integration` branch? Preserve with re-architecture commits stacked on top, or close and start fresh? Lean toward closing it and starting fresh when un-parking, because the architectural change is fundamental enough that incremental commits will be confusing.

## Files and locations

- Branch: `feat/sov-library-integration` (pushed, not merged)
- Schema: `stitch_library` and `stitch_library_candidates` tables in Supabase project vbtsdyxvqqwxjzpuseaf
- Reference images: Cloudinary `stitch-library/<slug>.png`, 307 files
- Reconciliation report: `C:\Users\adam\wovely\stitch-reconciliation-report.html`
- Original failure analysis: WOVELY_CONTEXT.md, "SOV ARCHITECTURE FAILURE ANALYSIS" section, Session 62 close

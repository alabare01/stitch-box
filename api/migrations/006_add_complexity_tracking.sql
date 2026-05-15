-- Migration 006 — complexity tracking (Queue System v1.5, Stage 1 — measurement)
--
-- Stage 1 adds a measurement layer to import_jobs so we can empirically find
-- the single-shot extraction cliff before deciding routing (chunking) in Stage
-- 2. No behavior changes from these columns alone — the worker writes them
-- before the existing extraction path runs and otherwise leaves the pipeline
-- untouched.
--
-- complexity_score jsonb default '{}'
--   Output of analyzeComplexity() in api/cron/process-queue.js. Shape:
--     {
--       component_count: int,       -- detected component headers (BODY, ARMS (make 2), ...)
--       row_count: int,             -- detected row/round markers (Row 1, Rnd 5, R12, ...)
--       text_length: int,           -- rawText.length, token-count proxy
--       page_count: int | null,     -- source PDF page count (null until plumbed through /api/import-job)
--       has_chart_markers: bool,    -- 'chart' / 'graph' / 'schematic' / symbol-heavy detection
--       has_images: bool,           -- embedded images in source PDF (null until plumbed)
--       analyzed_at: iso8601
--     }
--   For image imports the worker writes a zeroed shape (no rawText available
--   pre-extraction) so we still get an analyzed_at row for completeness.
--
-- estimated_seconds_total integer
--   Stage 2 will compute this from complexity_score against measured medians.
--   Stage 1 leaves it null on every row — the ETA / progress UI isn't built
--   yet and the pill is honest about not knowing the time.
--
-- path_taken text
--   'single_shot' for every row in Stage 1. Stage 2 introduces 'chunked' once
--   the cliff data is in. Indexed because the future analytics queries will
--   bucket on it heavily.

alter table public.import_jobs
  add column if not exists complexity_score jsonb default '{}'::jsonb,
  add column if not exists estimated_seconds_total integer,
  add column if not exists path_taken text;

create index if not exists idx_import_jobs_path_taken
  on public.import_jobs(path_taken);

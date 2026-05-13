-- Migration 005 — validation_report + phase tracking + pdf metadata title fallback (Queue System v1, Session 66)
--
-- Server-side BevCheck migration plus phase-based pill instrumentation.
--
-- validation_report jsonb
--   BevCheck result, populated by the worker after extraction succeeds and
--   before status flips to completed. The client used to call BevCheck itself;
--   that path passed pdfText:"" in the navigate-away → modal-reopen handoff and
--   silently produced an empty report. Server-side execution guarantees the
--   report is present whenever the modal flips to review and gives us one
--   source of truth.
--
-- current_phase text
--   Phase-aware progress for ImportPill. Worker writes 'reading' / 'extracting'
--   / 'validating' / 'finalizing' as it advances. Indexed where status =
--   'processing' so the queue dashboard can scan active phases cheaply.
--
-- phase_timestamps jsonb default '{}'
--   Append-only timestamps of the form { '<phase>_started_at': <iso8601> } the
--   worker writes via jsonb_build_object / || on each transition. Used by the
--   pill for per-phase elapsed time and by us for measuring real phase
--   durations after a couple weeks of production traffic.
--
-- pdf_metadata_title text
--   Client extracts pdf.getMetadata().info.Title in the browser (pdf.js
--   already loaded) and forwards it through /api/import-job. Worker uses it
--   as title fallback when the extracted title is empty/null — common on
--   chunked PDFs where the title page is image-only and the first chunk's
--   metadata-bearing fields get clobbered later. When the fallback fires the
--   worker suffixes extraction_method with `_with_pdf_meta_title` for analytics.

alter table public.import_jobs
  add column if not exists validation_report jsonb,
  add column if not exists current_phase text,
  add column if not exists phase_timestamps jsonb default '{}'::jsonb,
  add column if not exists pdf_metadata_title text;

create index if not exists idx_import_jobs_current_phase
  on public.import_jobs(current_phase)
  where status = 'processing';

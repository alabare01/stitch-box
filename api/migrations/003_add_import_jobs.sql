-- Migration 003 — import_jobs table for async pattern import queue (Queue System v1, Session 64)
--
-- Async substrate for long-running pattern imports. Client uploads file, POSTs to
-- /api/import-job, receives job_id, hands off to ImportPill. Worker dequeues
-- pending jobs every 60s (plus immediate kick on POST), extracts via existing
-- runPdfExtraction / runVisionExtraction, writes result back. RLS gates rows
-- by owner; the cron worker uses the service role key to bypass RLS.

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','processing','completed','failed')) default 'pending',
  file_type text not null check (file_type in ('pdf','image')),
  file_url text not null,
  raw_text text, -- client-extracted PDF text (required for pdf jobs, null for image)
  extracted_data jsonb,
  extraction_method text, -- 'pdf-text' | 'image-vision-haiku' | 'image-vision-gemini'
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_jobs_status_created_idx
  on public.import_jobs (status, created_at);

create index if not exists import_jobs_user_created_idx
  on public.import_jobs (user_id, created_at desc);

alter table public.import_jobs enable row level security;

create policy "import_jobs_select_own"
  on public.import_jobs
  for select
  using (user_id = auth.uid());

create policy "import_jobs_insert_own"
  on public.import_jobs
  for insert
  with check (user_id = auth.uid());

create policy "import_jobs_update_own"
  on public.import_jobs
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.set_import_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger import_jobs_set_updated_at
  before update on public.import_jobs
  for each row
  execute function public.set_import_jobs_updated_at();

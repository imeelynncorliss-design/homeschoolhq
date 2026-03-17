-- Migration: create portfolio_uploads
-- Stores work samples uploaded by parents during daily check-in.
-- Used for portfolio/compliance documentation.

create table public.portfolio_uploads (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null,
  kid_id          uuid,
  attendance_date date        not null,
  file_name       text        not null,
  file_url        text        not null,
  file_path       text        not null,
  file_type       text,
  file_size       bigint,
  uploaded_by     uuid        not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index portfolio_uploads_org_date_idx
  on public.portfolio_uploads (organization_id, attendance_date);

create index portfolio_uploads_kid_date_idx
  on public.portfolio_uploads (kid_id, attendance_date);

-- Row Level Security
alter table public.portfolio_uploads enable row level security;

create policy "org members can manage portfolio uploads"
  on public.portfolio_uploads
  for all
  using (
    exists (
      select 1 from public.user_organizations
      where user_id   = auth.uid()
        and organization_id = portfolio_uploads.organization_id
    )
  );

-- NOTE: Create the storage bucket manually in the Supabase dashboard:
--   Bucket name : portfolio-uploads
--   Public      : false
--   Allowed MIME: image/*, application/pdf
--   Max file size: 10 MB

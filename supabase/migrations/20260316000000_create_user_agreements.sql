-- Migration: create user_agreements
-- Tracks per-user acceptance of age confirmation and terms of service.

create table public.user_agreements (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  age_confirmed boolean     not null default false,
  tos_confirmed boolean     not null default false,
  agreed_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  constraint user_agreements_user_id_key unique (user_id)
);

-- Row Level Security
alter table public.user_agreements enable row level security;

-- Users can insert their own row
create policy "users can insert own agreement"
  on public.user_agreements
  for insert
  with check (auth.uid() = user_id);

-- Users can read their own row
create policy "users can select own agreement"
  on public.user_agreements
  for select
  using (auth.uid() = user_id);

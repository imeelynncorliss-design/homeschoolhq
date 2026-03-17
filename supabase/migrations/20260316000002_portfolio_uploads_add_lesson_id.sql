-- Add optional lesson_id to portfolio_uploads so uploads can be linked
-- to a specific lesson check-in as well as an attendance date.

alter table public.portfolio_uploads
  add column if not exists lesson_id uuid references public.lessons(id) on delete cascade;

create index if not exists portfolio_uploads_lesson_id_idx
  on public.portfolio_uploads (lesson_id);

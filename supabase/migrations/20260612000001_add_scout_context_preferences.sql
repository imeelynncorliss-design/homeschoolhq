-- Let parents decide which child profile fields Scout may use as prompt context.
-- Default is intentionally minimal for data minimization: age + grade only.

alter table public.kids
  add column if not exists scout_context_fields text[] not null default array['age', 'grade']::text[];

update public.kids
set scout_context_fields = array['age', 'grade']::text[]
where scout_context_fields is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kids_scout_context_fields_allowed'
  ) then
    alter table public.kids
      add constraint kids_scout_context_fields_allowed
      check (
        scout_context_fields <@ array[
          'displayname',
          'age',
          'grade',
          'learning_style',
          'current_hook',
          'mi_profile'
        ]::text[]
      );
  end if;
end $$;

comment on column public.kids.scout_context_fields is
  'Parent-selected child profile fields Scout may use as AI prompt context. Defaults to age and grade for data minimization.';

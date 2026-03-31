-- Allow parents to choose a bird and card color for each child
alter table kids
  add column if not exists avatar_index integer,
  add column if not exists color_index  integer;

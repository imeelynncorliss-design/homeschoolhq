-- Storage RLS policies for the portfolio-uploads bucket.
-- Supabase Storage uses RLS on storage.objects, separate from table RLS.
-- These allow any authenticated user to upload, view, and delete files in this bucket.

create policy "portfolio-uploads: authenticated can upload"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'portfolio-uploads');

create policy "portfolio-uploads: authenticated can read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'portfolio-uploads');

create policy "portfolio-uploads: authenticated can delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'portfolio-uploads');

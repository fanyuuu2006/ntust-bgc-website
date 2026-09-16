-- Public user avatars; application writes and deletes remain server-only.
begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
);

-- No storage.objects INSERT/UPDATE/DELETE policy is created. The application
-- server owns mutations through its secret key; browser roles receive no writes.
commit;

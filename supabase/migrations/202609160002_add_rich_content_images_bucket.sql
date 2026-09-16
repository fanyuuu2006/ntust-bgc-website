-- Public Rich Content assets; application writes remain server-only through the secret key.
begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'rich-content-images',
  'rich-content-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
);

-- No storage.objects INSERT/UPDATE/DELETE policy is created. The application
-- server owns uploads through its secret key; browser roles receive no writes.
commit;

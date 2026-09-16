do $$
declare
  bucket storage.buckets%rowtype;
begin
  select * into strict bucket
  from storage.buckets
  where id = 'rich-content-images';

  if bucket.name <> 'rich-content-images'
    or bucket.public is not true
    or bucket.file_size_limit <> 4194304
    or bucket.allowed_mime_types is distinct from
      array['image/jpeg', 'image/png', 'image/webp']::text[] then
    raise exception 'rich-content-images bucket configuration mismatch';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'rich_content_images%'
  ) then
    raise exception 'unexpected browser object policy';
  end if;
end $$;

-- Public Board Game cover assets; application writes and deletes remain server-only.
begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('board-game-images','board-game-images',true,4194304,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set name=excluded.name, public=excluded.public,
  file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
-- No storage.objects write policy is created; server credentials own mutations.
commit;

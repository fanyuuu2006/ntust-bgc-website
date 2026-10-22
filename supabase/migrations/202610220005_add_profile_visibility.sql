-- 個人檔案詳細內容與公開身份分離；既有與新帳號維持目前的公開行為。
create type public.profile_visibility as enum ('public', 'limited');

alter table public.users
  add column profile_visibility public.profile_visibility not null default 'public';

comment on column public.users.profile_visibility is
  '控制公開個人頁的詳細內容；limited 仍保留顯示名稱與頭像。';

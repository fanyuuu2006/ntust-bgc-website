-- Additive migration. Existing content is preserved verbatim; no conversion/update.
begin;

alter table public.announcements
  add column content_format text not null default 'plain_text',
  add column rich_content jsonb,
  add constraint announcements_content_format_check
    check (content_format in ('plain_text', 'rich_text_v1')),
  add constraint announcements_rich_content_check check (
    (content_format = 'plain_text' and rich_content is null)
    or (content_format = 'rich_text_v1' and rich_content is not null
      and jsonb_typeof(rich_content) = 'object'
      and coalesce(rich_content ->> 'type', '') = 'doc')
  );

comment on column public.announcements.content is 'Plain text for search/excerpts; derived server-side from rich_content for rich_text_v1.';
comment on column public.announcements.content_format is 'Explicit content version; existing announcements remain plain_text.';
comment on column public.announcements.rich_content is 'Validated rich_text_v1 document; null for legacy plain text.';

commit;

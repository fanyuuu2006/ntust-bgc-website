-- Additive Phase 3E-B migration, after 202609130001. No legacy text conversion.
begin;

alter table public.board_games
  add column description_format text not null default 'plain_text',
  add column rich_description jsonb,
  add constraint board_games_description_format_check check (description_format in ('plain_text', 'rich_text_v1')),
  add constraint board_games_rich_description_check check (
    (description_format = 'plain_text' and rich_description is null)
    or (description_format = 'rich_text_v1' and rich_description is not null
      and jsonb_typeof(rich_description) = 'object'
      and coalesce(rich_description ->> 'type', '') = 'doc')
  );
comment on column public.board_games.description is 'Searchable plain text, derived server-side for rich_text_v1; nullable for optional descriptions.';
comment on column public.board_games.rich_description is 'Validated rich_text_v1 document; null for legacy or empty descriptions.';

alter table public.events
  add column description_format text not null default 'plain_text',
  add column rich_description jsonb,
  add constraint events_description_format_check check (description_format in ('plain_text', 'rich_text_v1')),
  add constraint events_rich_description_check check (
    (description_format = 'plain_text' and rich_description is null)
    or (description_format = 'rich_text_v1' and rich_description is not null
      and jsonb_typeof(rich_description) = 'object'
      and coalesce(rich_description ->> 'type', '') = 'doc')
  );
comment on column public.events.description is 'Searchable plain text, derived server-side for rich_text_v1; nullable for optional descriptions.';
comment on column public.events.rich_description is 'Validated rich_text_v1 document; null for legacy or empty descriptions.';

commit;

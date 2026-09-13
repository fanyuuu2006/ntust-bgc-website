-- Read-only structure/count checks; do not dump author documents.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public'
and table_name in ('board_games', 'events')
and column_name in ('description', 'description_format', 'rich_description');
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint where conname in ('board_games_description_format_check', 'board_games_rich_description_check', 'events_description_format_check', 'events_rich_description_check');
select 'board_games' as entity, description_format, count(*) from public.board_games group by description_format
union all select 'events', description_format, count(*) from public.events group by description_format;

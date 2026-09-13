-- Read-only checks after applying 202609130001 in the intended environment.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'announcements'
  and column_name in ('content', 'content_format', 'rich_content');

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.announcements'::regclass
  and conname in ('announcements_content_format_check', 'announcements_rich_content_check');

-- Counts only: do not dump author content or user data for verification.
select content_format, count(*) from public.announcements group by content_format;

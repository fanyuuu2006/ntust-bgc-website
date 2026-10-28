create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  description_format text not null default 'plain_text' check (description_format in ('plain_text','rich_text_v1')),
  rich_description jsonb,
  calendar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_templates_updated_at_idx on public.event_templates (updated_at desc);

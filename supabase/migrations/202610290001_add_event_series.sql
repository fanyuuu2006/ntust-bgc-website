create table if not exists public.event_series (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 200),
  timezone text not null default 'Asia/Taipei',
  recurrence_rule jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  occurrence_count integer,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_series_occurrence_count_check check (occurrence_count is null or occurrence_count between 1 and 200),
  constraint event_series_end_after_start_check check (ends_at is null or ends_at >= starts_at)
);

alter table public.events add column if not exists series_id uuid references public.event_series(id) on delete restrict;
alter table public.events add column if not exists recurrence_instance_key text;
alter table public.events add column if not exists original_start_time timestamptz;

create unique index if not exists events_series_occurrence_key_idx
  on public.events (series_id, recurrence_instance_key)
  where series_id is not null and recurrence_instance_key is not null;
create index if not exists events_series_id_idx on public.events (series_id);
create index if not exists event_series_created_by_idx on public.event_series (created_by);

-- Series 僅由 server-side service role／授權 Service 存取；瀏覽器端預設拒絕直接讀寫。
alter table public.event_series enable row level security;

comment on table public.event_series is '通用活動系列；實際可發布與簽到的場次仍保存在 events。';
comment on column public.events.recurrence_instance_key is '以原始排程日期時間與時區建立的穩定 occurrence identity。';

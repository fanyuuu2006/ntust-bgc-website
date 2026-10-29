create table if not exists public.event_series_requests (
  actor_id uuid not null references public.users(id) on delete restrict,
  idempotency_key text not null,
  request_hash text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, idempotency_key)
);

alter table public.event_series_requests enable row level security;

create or replace function public.create_event_series(
  p_actor_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_series jsonb,
  p_occurrences jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.event_series_requests;
  series_id uuid;
  occurrence_ids uuid[];
  occurrence_id uuid;
  occurrence jsonb;
begin
  if not exists (
    select 1 from public.users u
    join public.officer_positions op on op.user_id = u.id
    where u.id = p_actor_id and u.closed_at is null
  ) then
    raise exception '活動系列需要管理員權限' using errcode = '42501';
  end if;

  insert into public.event_series_requests(actor_id, idempotency_key, request_hash)
  values (p_actor_id, p_idempotency_key, p_request_hash)
  on conflict (actor_id, idempotency_key) do nothing
  returning * into existing;

  if existing.idempotency_key is null then
    select * into existing
      from public.event_series_requests
      where actor_id = p_actor_id and idempotency_key = p_idempotency_key
      for update;
  end if;
  if existing.idempotency_key is not null and existing.result is not null then
    if existing.request_hash <> p_request_hash then
      raise exception '相同 Idempotency Key 不可搭配不同內容' using errcode = '22023';
    end if;
    return existing.result;
  end if;

  insert into public.event_series(name, timezone, recurrence_rule, starts_at, ends_at, occurrence_count, created_by)
  values (
    p_series->>'name', p_series->>'timezone', p_series->'recurrence_rule',
    (p_series->>'starts_at')::timestamptz, nullif(p_series->>'ends_at', '')::timestamptz,
    (p_series->>'occurrence_count')::integer, p_actor_id
  ) returning id into series_id;

  for occurrence in select * from jsonb_array_elements(p_occurrences) loop
    insert into public.events(
      name, description, description_format, rich_description, start_time, end_time,
      check_in_opens_at, check_in_closes_at, calendar_color, publication_status,
      series_id, recurrence_instance_key, original_start_time
    ) values (
      occurrence->>'name', occurrence->>'description', occurrence->>'description_format',
      occurrence->'rich_description', (occurrence->>'start_time')::timestamptz,
      (occurrence->>'end_time')::timestamptz,
      nullif(occurrence->>'check_in_opens_at', '')::timestamptz,
      nullif(occurrence->>'check_in_closes_at', '')::timestamptz,
      nullif(occurrence->>'calendar_color', ''), 'draft', series_id,
      occurrence->>'recurrence_instance_key', (occurrence->>'original_start_time')::timestamptz
    ) returning id into occurrence_id;
    occurrence_ids := array_append(occurrence_ids, occurrence_id);
  end loop;

  update public.event_series_requests
    set result = jsonb_build_object('series_id', series_id, 'occurrence_ids', to_jsonb(occurrence_ids), 'occurrence_count', coalesce(array_length(occurrence_ids, 1), 0))
    where actor_id = p_actor_id and idempotency_key = p_idempotency_key;
  return (select result from public.event_series_requests where actor_id = p_actor_id and idempotency_key = p_idempotency_key);
end;
$$;

revoke all on function public.create_event_series(uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_event_series(uuid, text, text, jsonb, jsonb) to service_role;

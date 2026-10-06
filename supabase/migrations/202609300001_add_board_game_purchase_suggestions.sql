-- Private suggestions. The application's verified Session supplies the actor;
-- clients never access this table or these RPCs directly.
create table public.board_game_purchase_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  game_name text not null,
  normalized_name text generated always as (lower(regexp_replace(btrim(game_name), '[[:space:]]+', ' ', 'g'))) stored,
  reason text not null,
  reference_url text,
  status text not null default 'pending',
  request_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  reviewed_by_user_id uuid references public.users(id),
  reviewed_at timestamptz,
  version integer not null default 1,
  deleted_at timestamptz,
  deleted_by_user_id uuid references public.users(id),
  purchase_notice_version integer not null default 0,
  purchase_notice_read_version integer not null default 0,
  purchase_notice_unread boolean generated always as (purchase_notice_read_version < purchase_notice_version) stored,
  constraint purchase_suggestions_name_check check (char_length(game_name) between 1 and 120 and game_name ~ '[^[:space:]]' and game_name !~ '[[:cntrl:]]'),
  constraint purchase_suggestions_reason_check check (char_length(reason) between 10 and 1000 and reason ~ '[^[:space:]]'),
  constraint purchase_suggestions_url_check check (reference_url is null or (char_length(reference_url) between 1 and 500 and reference_url ~* '^https?://[^[:space:]/?#@]+([/?#]|$)' and reference_url !~ '[[:cntrl:]]')),
  constraint purchase_suggestions_status_check check (status in ('pending','purchased','rejected')),
  constraint purchase_suggestions_review_check check (
    (status = 'pending' and reviewed_at is null and reviewed_by_user_id is null) or
    (status <> 'pending' and reviewed_at is not null and reviewed_by_user_id is not null)
  ),
  constraint purchase_suggestions_delete_check check ((deleted_at is null) = (deleted_by_user_id is null)),
  constraint purchase_suggestions_version_check check (version > 0 and purchase_notice_version >= 0 and purchase_notice_read_version between 0 and purchase_notice_version),
  constraint purchase_suggestions_request_key unique(user_id, request_id)
);
create unique index purchase_suggestions_pending_name_idx on public.board_game_purchase_suggestions(user_id, normalized_name) where status = 'pending' and deleted_at is null;
create index purchase_suggestions_user_created_idx on public.board_game_purchase_suggestions(user_id, created_at desc, id);
create index purchase_suggestions_user_name_created_idx on public.board_game_purchase_suggestions(user_id, normalized_name, created_at desc);
create index purchase_suggestions_status_created_idx on public.board_game_purchase_suggestions(status, created_at, id) where deleted_at is null;
create index purchase_suggestions_created_idx on public.board_game_purchase_suggestions(created_at desc, id) where deleted_at is null;
create index purchase_suggestions_unread_idx on public.board_game_purchase_suggestions(user_id, updated_at desc) where deleted_at is null and status = 'purchased' and purchase_notice_read_version < purchase_notice_version;

alter table public.board_game_purchase_suggestions enable row level security;
revoke all on table public.board_game_purchase_suggestions from public, anon, authenticated, service_role;
grant select on table public.board_game_purchase_suggestions to service_role;

create function public.submit_board_game_purchase_suggestion(
  p_user_id uuid, p_request_id uuid, p_game_name text, p_reason text, p_reference_url text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.board_game_purchase_suggestions%rowtype;
  v_now timestamptz;
  v_week timestamptz;
  v_latest timestamptz;
  v_name text;
  v_id uuid;
begin
  -- Same lock order as account closure. A second writer reads fresh counts
  -- after obtaining the user lock; never split quota check and insert.
  perform 1 from public.users where id = p_user_id and closed_at is null and email_verified_at is not null for update;
  if not found then return jsonb_build_object('outcome','ineligible'); end if;
  v_now := clock_timestamp();
  v_week := date_trunc('week', v_now at time zone 'Asia/Taipei') at time zone 'Asia/Taipei';
  p_game_name := btrim(p_game_name);
  p_reason := btrim(p_reason);
  p_reference_url := nullif(btrim(p_reference_url), '');
  v_name := lower(regexp_replace(p_game_name, '[[:space:]]+', ' ', 'g'));
  select * into v_existing from public.board_game_purchase_suggestions where user_id = p_user_id and request_id = p_request_id;
  if found then
    if v_existing.game_name = p_game_name and v_existing.reason = p_reason and v_existing.reference_url is not distinct from p_reference_url then
      -- Do not expose original content, including after moderation deletion.
      return jsonb_build_object('outcome','received','id',v_existing.id,'replayed',true);
    end if;
    return jsonb_build_object('outcome','request_conflict');
  end if;
  if exists(select 1 from public.board_game_purchase_suggestions where user_id = p_user_id and normalized_name = v_name
    and ((status = 'pending' and deleted_at is null) or created_at > v_now - interval '30 days')) then
    return jsonb_build_object('outcome','duplicate');
  end if;
  select max(created_at) into v_latest from public.board_game_purchase_suggestions where user_id = p_user_id;
  if v_latest > v_now - interval '60 seconds' then
    return jsonb_build_object('outcome','cooldown','retry_after',greatest(1,ceil(extract(epoch from v_latest + interval '60 seconds' - v_now))::integer));
  end if;
  -- Includes rejected, purchased and soft-deleted rows.
  if (select count(*) from public.board_game_purchase_suggestions where user_id = p_user_id and created_at >= v_week and created_at < v_week + interval '7 days') >= 3 then
    return jsonb_build_object('outcome','weekly_limit','retry_after',greatest(1,ceil(extract(epoch from v_week + interval '7 days' - v_now))::integer));
  end if;
  insert into public.board_game_purchase_suggestions(user_id,request_id,game_name,reason,reference_url,created_at,updated_at)
  values(p_user_id,p_request_id,p_game_name,p_reason,p_reference_url,v_now,v_now) returning id into v_id;
  return jsonb_build_object('outcome','received','id',v_id,'replayed',false);
end $$;

create function public.manage_board_game_purchase_suggestion(
  p_actor_id uuid, p_id uuid, p_version integer, p_action text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.board_game_purchase_suggestions%rowtype;
begin
  -- Preserve the application's historical-Officer rule, not current-year membership.
  if not exists(select 1 from public.users u where u.id = p_actor_id and u.closed_at is null and u.email_verified_at is not null
    and exists(select 1 from public.officer_positions o where o.user_id = u.id)) then
    return jsonb_build_object('outcome','forbidden');
  end if;
  if p_action is null or p_action not in ('purchased','rejected','delete') then
    return jsonb_build_object('outcome','invalid_action');
  end if;
  select * into v_row from public.board_game_purchase_suggestions where id = p_id and deleted_at is null for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if p_version is distinct from v_row.version then return jsonb_build_object('outcome','version_conflict'); end if;
  if p_action = 'delete' then
    update public.board_game_purchase_suggestions set deleted_at = clock_timestamp(), deleted_by_user_id = p_actor_id,
      updated_at = clock_timestamp(), version = version + 1 where id = p_id;
  elsif p_action <> v_row.status then
    update public.board_game_purchase_suggestions set status = p_action, reviewed_by_user_id = p_actor_id,
      reviewed_at = clock_timestamp(), updated_at = clock_timestamp(), version = version + 1,
      purchase_notice_version = purchase_notice_version + case when p_action = 'purchased' then 1 else 0 end where id = p_id;
  end if;
  return jsonb_build_object('outcome','updated');
end $$;

create function public.read_board_game_purchase_notice(p_user_id uuid, p_id uuid, p_notice_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.users where id = p_user_id and closed_at is null and email_verified_at is not null) then
    return jsonb_build_object('outcome','ineligible');
  end if;
  update public.board_game_purchase_suggestions
    set purchase_notice_read_version = greatest(purchase_notice_read_version, p_notice_version)
    where id = p_id and user_id = p_user_id and deleted_at is null and status = 'purchased'
      and p_notice_version > 0 and p_notice_version <= purchase_notice_version;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  -- Do not touch version/updated_at: reading is not an administrative edit.
  return jsonb_build_object('outcome','read');
end $$;

revoke all on function public.submit_board_game_purchase_suggestion(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.manage_board_game_purchase_suggestion(uuid,uuid,integer,text) from public, anon, authenticated;
revoke all on function public.read_board_game_purchase_notice(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.submit_board_game_purchase_suggestion(uuid,uuid,text,text,text) to service_role;
grant execute on function public.manage_board_game_purchase_suggestion(uuid,uuid,integer,text) to service_role;
grant execute on function public.read_board_game_purchase_notice(uuid,uuid,integer) to service_role;

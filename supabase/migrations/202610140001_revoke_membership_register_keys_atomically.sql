create function public.revoke_membership_register_keys(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_locked_count integer := 0;
  v_updated_count integer := 0;
  v_now timestamptz := clock_timestamp();
begin
  if p_ids is null or cardinality(p_ids) < 1 or cardinality(p_ids) > 100 then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  if cardinality(p_ids) <> (
    select count(distinct input.id)
    from unnest(p_ids) as input(id)
  ) then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  -- A deterministic lock order avoids deadlocks between overlapping batches.
  for v_id in
    select register_key.id
    from public.membership_register_keys as register_key
    where register_key.id = any(p_ids)
    order by register_key.id
    for update
  loop
    v_locked_count := v_locked_count + 1;
  end loop;

  if v_locked_count <> cardinality(p_ids) then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  if exists (
    select 1
    from public.membership_register_keys as register_key
    where register_key.id = any(p_ids)
      and register_key.status <> 'available'::public.membership_register_key_status
  ) then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  update public.membership_register_keys as register_key
  set status = 'revoked'::public.membership_register_key_status,
      revoked_at = v_now
  where register_key.id = any(p_ids);

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> cardinality(p_ids) then
    raise exception 'Atomic register-key revoke updated an unexpected row count';
  end if;

  return jsonb_build_object(
    'outcome', 'revoked',
    'revoked_count', v_updated_count
  );
end;
$$;

revoke all privileges on function public.revoke_membership_register_keys(uuid[])
from public, anon, authenticated, service_role;
grant execute on function public.revoke_membership_register_keys(uuid[])
to service_role;

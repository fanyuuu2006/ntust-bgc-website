create function public.update_admin_memberships_status(
  p_items jsonb,
  p_status public.merbership_status
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_item_count integer;
  v_locked_count integer := 0;
  v_updated_count integer := 0;
begin
  if p_status is null
     or p_items is null
     or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 100 then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  if v_item_count <> (
    select count(distinct input.id)
    from jsonb_to_recordset(p_items) as input(
      id uuid,
      expected_status public.merbership_status,
      expected_academic_year_id uuid,
      expected_updated_at timestamptz
    )
  ) then
    return jsonb_build_object('outcome', 'invalid_input');
  end if;

  if 1 <> (
    select count(distinct input.expected_academic_year_id)
    from jsonb_to_recordset(p_items) as input(
      id uuid,
      expected_status public.merbership_status,
      expected_academic_year_id uuid,
      expected_updated_at timestamptz
    )
  ) then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  -- Lock overlapping batches in a deterministic order.
  for v_id in
    select membership.id
    from public.memberships as membership
    join jsonb_to_recordset(p_items) as input(
      id uuid,
      expected_status public.merbership_status,
      expected_academic_year_id uuid,
      expected_updated_at timestamptz
    ) on input.id = membership.id
    order by membership.id
    for update of membership
  loop
    v_locked_count := v_locked_count + 1;
  end loop;

  if v_locked_count <> v_item_count then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  if exists (
    select 1
    from public.memberships as membership
    join jsonb_to_recordset(p_items) as input(
      id uuid,
      expected_status public.merbership_status,
      expected_academic_year_id uuid,
      expected_updated_at timestamptz
    ) on input.id = membership.id
    where membership.status is distinct from input.expected_status
      or membership.academic_year_id is distinct from input.expected_academic_year_id
      or membership.updated_at is distinct from input.expected_updated_at
      or not (
        membership.status = p_status
        or (membership.status = 'pending'::public.merbership_status
          and p_status in ('active', 'cancelled'))
        or (membership.status = 'active'::public.merbership_status
          and p_status in ('suspended', 'cancelled', 'expired'))
        or (membership.status = 'suspended'::public.merbership_status
          and p_status in ('active', 'cancelled'))
      )
  ) then
    return jsonb_build_object('outcome', 'conflict');
  end if;

  begin
    update public.memberships as membership
    set status = p_status
    where membership.id in (
      select input.id
      from jsonb_to_recordset(p_items) as input(id uuid)
    );

    get diagnostics v_updated_count = row_count;
    if v_updated_count <> v_item_count then
      raise exception 'Atomic membership update affected an unexpected row count';
    end if;
  exception
    when unique_violation then
      return jsonb_build_object('outcome', 'conflict');
  end;

  return jsonb_build_object(
    'outcome', 'updated',
    'updated_count', v_updated_count
  );
end;
$$;

revoke all privileges on function public.update_admin_memberships_status(
  jsonb,
  public.merbership_status
) from public, anon, authenticated, service_role;
grant execute on function public.update_admin_memberships_status(
  jsonb,
  public.merbership_status
) to service_role;

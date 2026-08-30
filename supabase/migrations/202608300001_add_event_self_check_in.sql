-- Self check-in MVP: both timestamps must be set for an event to be open.
-- Prior read-only data preflight confirmed no duplicate (event_id, user_id) rows.

alter table public.events
  add column check_in_opens_at timestamptz null,
  add column check_in_closes_at timestamptz null,
  add constraint events_check_in_window_check check (
    (check_in_opens_at is null and check_in_closes_at is null)
    or (
      check_in_opens_at is not null
      and check_in_closes_at is not null
      and check_in_opens_at <= check_in_closes_at
    )
  );

alter table public.event_attendances
  add constraint event_attendances_event_id_user_id_key
  unique (event_id, user_id);

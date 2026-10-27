-- Optional per-event calendar color. Existing events remain unchanged.
alter table public.events
  add column if not exists calendar_color text;

alter table public.events
  drop constraint if exists events_calendar_color_hex;

alter table public.events
  add constraint events_calendar_color_hex
  check (calendar_color is null or calendar_color ~ '^#[0-9A-Fa-f]{6}$');

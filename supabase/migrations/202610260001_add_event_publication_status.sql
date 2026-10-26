-- Event Calendar Phase 1A: publication visibility and cancellation marker.
-- Existing events are intentionally backfilled as published so migration does
-- not require club officers to republish historical activities manually.
begin;

alter table public.events
  add column publication_status text not null default 'draft',
  add column cancelled_at timestamptz null,
  add constraint events_publication_status_check
    check (publication_status in ('draft', 'published'));

update public.events
set publication_status = 'published'
where publication_status = 'draft';

commit;

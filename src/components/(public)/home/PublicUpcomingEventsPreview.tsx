import { reportUnexpectedError } from "@/libs/observability/report";
import { eventsService } from "@/services/events/events.service";
import { PublicUpcomingEventsList, type UpcomingEventPreview } from "./PublicUpcomingEventsList";

export function PublicUpcomingEventsPreview() {
  return <UpcomingEventsContent />;
}

async function UpcomingEventsContent() {
  let events;
  try {
    events = await eventsService.getPublicUpcomingEvents(3);
  } catch (error) {
    reportUnexpectedError(error, { context: "home.upcoming-events" });
    return <section aria-labelledby="upcoming-events-title" className="py-2 text-sm text-(--text-muted)"><h2 id="upcoming-events-title" className="text-xl font-bold text-(--text-primary)">近期活動</h2><p className="mt-2">近期活動暫時無法載入，請前往行事曆查看。</p></section>;
  }
  return <PublicUpcomingEventsList events={events as UpcomingEventPreview[]} />;
}

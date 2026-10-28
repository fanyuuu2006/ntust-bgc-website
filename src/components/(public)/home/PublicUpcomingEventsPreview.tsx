import { reportUnexpectedError } from "@/libs/observability/report";
import { eventsService } from "@/services/events/events.service";
import { PublicUpcomingEventsList, type UpcomingEventPreview } from "./PublicUpcomingEventsList";

export function PublicUpcomingEventsPreview() { return <UpcomingEventsContent />; }

async function UpcomingEventsContent() {
  let events;
  try {
    events = await eventsService.getPublicUpcomingEvents(3);
  } catch (error) {
    reportUnexpectedError(error, { context: "home.upcoming-events" });
    return <p role="alert" className="py-2 text-sm text-(--text-muted)">近期活動暫時無法載入，請稍後再試。</p>;
  }
  return <PublicUpcomingEventsList events={events as UpcomingEventPreview[]} />;
}

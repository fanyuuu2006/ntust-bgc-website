import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";

import { reportUnexpectedError } from "@/libs/observability/report";
import { eventsService } from "@/services/events/events.service";
import { formatCompactDateTimeRange } from "@/utils/date";

export function PublicUpcomingEventsPreview() {
  return <UpcomingEventsContent />;
}

async function UpcomingEventsContent() {
  let events;
  try {
    events = await eventsService.getPublicUpcomingEvents(3);
  } catch (error) {
    reportUnexpectedError(error, { context: "home.upcoming-events" });
    return <section className="rounded-2xl border border-(--border-muted) bg-(--surface-subtle) p-4 text-sm text-(--text-muted)">近期活動暫時無法載入，請前往行事曆查看。</section>;
  }

  return (
    <section aria-labelledby="upcoming-events-title" className="rounded-2xl border border-(--border-muted) bg-(--surface-default) p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="upcoming-events-title" className="text-xl font-bold text-(--text-primary)">近期活動</h2>
          <p className="mt-1 text-sm text-(--text-muted)">找一場喜歡的活動，一起來玩桌遊。</p>
        </div>
        <Link href="/schedule" className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
          查看全部 <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {events.length ? (
        <ul className="mt-4 divide-y divide-(--border-muted)">
          {events.map((event) => (
            <li key={event.id} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-(--interactive-primary)" />
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word font-semibold text-(--text-primary)">{event.name}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-(--text-muted)">
                  <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
                  {formatCompactDateTimeRange(event.start_time, event.end_time).start}
                  {event.is_cancelled ? <span className="font-medium text-(--status-danger)"> · 已取消</span> : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-(--text-muted)">目前沒有即將開始的活動。</p>
      )}
    </section>
  );
}

import { ClipboardCheck, Clock3 } from "lucide-react";

import { CheckInButton } from "@/components/(authenticated)/dashboard/CheckInButton";
import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { Card } from "@/components/ui/Card";
import type { SelfCheckInEvent } from "@/services/events/events.types";
import { formatCompactDateTimeRange } from "@/utils/date";

export function SelfCheckInEvents({ events }: { events: SelfCheckInEvent[] }) {
  if (events.length === 0) return null;

  const hasAvailableCheckIn = events.some(({ attendance }) => !attendance);
  const orderedEvents = [...events].sort((a, b) => Number(Boolean(a.attendance)) - Number(Boolean(b.attendance)));

  return (
    <Card surface={hasAvailableCheckIn ? "default" : "subtle"} className="p-3 sm:p-4">
      <section aria-labelledby="self-check-in-title">
        <DashboardSectionHeader
          id="self-check-in-title"
          icon={<ClipboardCheck aria-hidden="true" className="size-5" />}
          title="活動簽到"
        />

        <ul className="mt-2.5 flex flex-col gap-1.5 sm:mt-3 sm:gap-2">
          {orderedEvents.map(({ event, attendance }) => {
            const eventTime = formatCompactDateTimeRange(event.start_time, event.end_time);
            return (
              <li key={event.id} className="min-w-0 rounded-xl bg-(--surface-subtle) px-2.5 py-2 sm:px-3 sm:py-2.5">
                <p className="min-w-0 wrap-anywhere font-semibold leading-6 text-(--text-primary)">{event.name}</p>
                <div className="mt-1 flex min-w-0 items-start justify-between gap-2">
                  <p className="flex min-w-0 flex-1 items-start gap-2 text-sm text-(--text-muted)">
                    <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 break-words">{eventTime.start}–{eventTime.end}</span>
                  </p>
                  {!attendance ? <CheckInButton eventId={event.id} /> : null}
                </div>
                {attendance ? <p className="mt-1 text-sm font-medium text-(--status-success)">已簽到</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </Card>
  );
}

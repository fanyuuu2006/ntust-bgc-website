import { ClipboardCheck, Clock3 } from "lucide-react";

import { CheckInButton } from "@/components/(authenticated)/dashboard/CheckInButton";
import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { Card } from "@/components/ui/Card";
import type { SelfCheckInEvent } from "@/services/events/events.types";
import { formatDateTime } from "@/utils/date";

export function SelfCheckInEvents({ events }: { events: SelfCheckInEvent[] }) {
  if (events.length === 0) return null;

  const hasAvailableCheckIn = events.some(({ attendance }) => !attendance);
  const orderedEvents = [...events].sort((a, b) => Number(Boolean(a.attendance)) - Number(Boolean(b.attendance)));

  return (
    <Card surface={hasAvailableCheckIn ? "default" : "subtle"} className="p-4">
      <section aria-labelledby="self-check-in-title">
        <DashboardSectionHeader
          id="self-check-in-title"
          icon={<ClipboardCheck aria-hidden="true" className="size-5" />}
          title="活動簽到"
        />

        <ul className="mt-3 flex flex-col gap-2">
          {orderedEvents.map(({ event, attendance }) => (
            <li key={event.id} className="rounded-xl bg-(--surface-subtle) px-3 py-2.5">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="wrap-anywhere font-semibold leading-6 text-(--text-primary)">{event.name}</p>
                  {!attendance ? <p className="mt-1 flex min-w-0 items-start gap-2 text-sm text-(--text-muted)">
                    <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 wrap-anywhere">{formatDateTime(event.start_time)}–{formatDateTime(event.end_time)}</span>
                  </p> : null}
                </div>
                {attendance ? <p className="text-sm font-medium text-(--status-success)">已簽到</p> : <CheckInButton eventId={event.id} />}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Card>
  );
}

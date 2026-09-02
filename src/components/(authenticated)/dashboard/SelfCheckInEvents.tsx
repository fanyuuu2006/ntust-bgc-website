import { ClipboardCheck, Clock3 } from "lucide-react";

import { CheckInButton } from "@/components/(authenticated)/dashboard/CheckInButton";
import { Card } from "@/components/ui/Card";
import type { SelfCheckInEvent } from "@/services/events/events.types";
import { formatDateTime } from "@/utils/date";

export function SelfCheckInEvents({ events }: { events: SelfCheckInEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section aria-labelledby="self-check-in-title">
      <h2
        id="self-check-in-title"
        className="flex items-center gap-2 text-xl font-semibold text-(--text-primary)"
      >
        <ClipboardCheck aria-hidden="true" className="size-5 text-(--interactive-primary)" />
        活動簽到
      </h2>

      <ul className="mt-4 grid gap-3">
        {events.map(({ event, attendance }) => (
          <li key={event.id}>
            <Card surface="subtle" className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-(--text-primary)">{event.name}</p>
                  <p className="mt-2 text-sm text-(--text-muted)">
                    活動時間：{formatDateTime(event.start_time)}–{formatDateTime(event.end_time)}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-(--text-muted)">
                    <Clock3 aria-hidden="true" className="size-4 shrink-0" />
                    簽到開放至 {formatDateTime(event.check_in_closes_at)}
                  </p>
                </div>
                {attendance ? (
                  <p className="text-sm font-medium text-(--status-success)">已簽到</p>
                ) : (
                  <CheckInButton eventId={event.id} />
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

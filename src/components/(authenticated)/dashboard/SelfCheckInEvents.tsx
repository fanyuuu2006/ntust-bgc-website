import { ClipboardCheck, Clock3 } from "lucide-react";

import { CheckInButton } from "@/components/(authenticated)/dashboard/CheckInButton";
import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { Card } from "@/components/ui/Card";
import type { SelfCheckInEvent } from "@/services/events/events.types";
import { formatDateTime } from "@/utils/date";

export function SelfCheckInEvents({ events }: { events: SelfCheckInEvent[] }) {
  return (
    <Card className="p-4">
      <section aria-labelledby="self-check-in-title">
        <DashboardSectionHeader
          id="self-check-in-title"
          icon={<ClipboardCheck aria-hidden="true" className="size-5" />}
          title="活動簽到"
        />

        {events.length === 0 ? (
          <p className="mt-3 text-sm text-(--text-muted)">目前沒有可簽到的活動。</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {events.map(({ event, attendance }) => (
              <li key={event.id} className="rounded-xl bg-(--surface-subtle) px-3 py-2.5">
                <p className="break-words font-semibold leading-6 text-(--text-primary)">{event.name}</p>
                <p className="mt-1 flex min-w-0 items-start gap-2 text-sm text-(--text-muted)">
                  <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 break-words">
                    {formatDateTime(event.start_time)}–{formatDateTime(event.end_time)}
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {attendance ? (
                    <p className="text-sm font-medium text-(--status-success)">已簽到</p>
                  ) : (
                    <p className="text-sm font-medium text-(--text-secondary)">目前可以簽到</p>
                  )}
                  {!attendance ? <CheckInButton eventId={event.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

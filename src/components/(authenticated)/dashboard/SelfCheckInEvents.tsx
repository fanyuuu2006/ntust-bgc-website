"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import type { EventAttendance } from "@/types/database";
import type { SelfCheckInEvent } from "@/services/events/events.types";
import { formatAdminDateTime } from "@/utils/date";

type CheckInResponse = { data: EventAttendance };

export function SelfCheckInEvents({ events }: { events: SelfCheckInEvent[] }) {
  const router = useRouter();
  const [attendances, setAttendances] = useState(() =>
    new Map(
      events.flatMap((item) =>
        item.attendance ? [[item.event.id, item.attendance] as const] : [],
      ),
    ),
  );
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (events.length === 0) return null;

  const checkIn = async (eventId: string) => {
    setBusyEventId(eventId);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient<CheckInResponse>(
        `/api/events/${eventId}/check-in`,
        { method: "POST" },
      );
      setAttendances((current) => {
        const next = new Map(current);
        next.set(eventId, response.data);
        return next;
      });
      setSuccess("簽到成功");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "簽到失敗，請稍後再試");
    } finally {
      setBusyEventId(null);
    }
  };

  return (
    <section className="card rounded-2xl p-5">
      <h2 className="font-bold">可簽到活動</h2>
      <div className="mt-4 space-y-3">
        {events.map(({ event, attendance }) => {
          const localAttendance = attendances.get(event.id) ?? attendance;
          const isAbsent = localAttendance?.status === "absent";

          return (
            <article
              key={event.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl bg-(--secondary-background) p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{event.name}</p>
                <p className="mt-1 text-xs text-(--muted)">
                  簽到截止：{formatAdminDateTime(event.check_in_closes_at)}
                </p>
                {localAttendance ? (
                  <p className="mt-1 text-sm text-(--status-success)">
                    {isAbsent
                      ? "簽到紀錄已由幹部登錄"
                      : `已簽到：${formatAdminDateTime(localAttendance.attended_at)}`}
                  </p>
                ) : null}
              </div>
              {!localAttendance ? (
                <Button
                  type="button"
                  className="w-full shrink-0 sm:w-auto"
                  isLoading={busyEventId === event.id}
                  disabled={busyEventId !== null}
                  onClick={() => checkIn(event.id)}
                >
                  簽到
                </Button>
              ) : null}
            </article>
          );
        })}
      </div>
      <FormFeedback className="mt-3" error={error} success={success} />
    </section>
  );
}

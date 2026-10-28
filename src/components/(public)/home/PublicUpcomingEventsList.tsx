"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { EventDetailsContent } from "@/components/calendar/EventDetailsContent";
import type { PocCalendarEvent } from "@/components/calendar/calendar-utils";
import { formatCompactDateTimeRange } from "@/utils/date";
import "@/components/calendar/calendar.css";

export type UpcomingEventPreview = {
  id: string;
  name: string;
  description: string | null;
  description_format: "plain_text" | "rich_text_v1";
  rich_description: unknown;
  start_time: string;
  end_time: string | null;
  is_cancelled: boolean;
  calendar_color: string | null;
};

export function PublicUpcomingEventsList({ events }: { events: UpcomingEventPreview[] }) {
  const [selected, setSelected] = useState<UpcomingEventPreview | null>(null);
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-(--border-muted) bg-(--surface-default)">
        {events.length ? <ul className="divide-y divide-(--border-muted)">{events.map((event) => <li key={event.id}>
          <button type="button" aria-label={`${event.name}，查看活動詳情`} className="flex min-h-20 w-full items-center gap-3 p-3 text-left transition-colors hover:bg-(--surface-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--interactive-primary) sm:p-4" onClick={() => setSelected(event)}>
            <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-(--surface-subtle) text-xs font-semibold text-(--interactive-primary)"><CalendarDays aria-hidden="true" className="mb-0.5 size-4" />{new Date(event.start_time).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" })}</span>
            <span className="min-w-0 flex-1"><span className="block wrap-break-word font-semibold text-(--text-primary)">{event.name}</span><span className="mt-1 flex items-center gap-1 text-sm text-(--text-muted)"><Clock3 aria-hidden="true" className="size-3.5 shrink-0" />{formatCompactDateTimeRange(event.start_time, event.end_time).start}{event.is_cancelled ? <span className="font-medium text-(--status-danger)"> · 已取消</span> : null}</span></span>
            <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-(--text-muted)" />
          </button>
        </li>)}</ul> : <p className="p-4 text-sm text-(--text-muted)">目前沒有近期活動。</p>}
      </div>
      <Modal open={selected !== null} onClose={() => setSelected(null)} title="活動詳情" size="md">
        {selected ? <EventDetailsContent event={toCalendarEvent(selected)} /> : null}
      </Modal>
    </>
  );
}

function toCalendarEvent(event: UpcomingEventPreview): PocCalendarEvent {
  return { id: event.id, title: event.name, description: event.description ?? undefined, descriptionFormat: event.description_format, richDescription: event.rich_description, start: event.start_time, end: event.end_time ?? undefined, cancelled: event.is_cancelled, calendarColor: event.calendar_color };
}

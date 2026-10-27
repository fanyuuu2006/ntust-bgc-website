"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EventCalendar } from "@/components/calendar/EventCalendar";
import { formatPocDateInput, getPocMonthRange, type PocCalendarEvent } from "@/components/calendar/calendar-utils";
import type { CalendarHoliday } from "@/components/calendar/calendar-holidays";

type AdminEvent = { id: string; name: string; description: string | null; description_format: "plain_text" | "rich_text_v1"; rich_description: unknown; start_time: string; end_time: string | null; cancelled_at: string | null; publication_status: "draft" | "published"; calendar_color: string | null };

export function AdminEventCalendar({ holidays }: { holidays: CalendarHoliday[] }) {
  const [month, setMonth] = useState(() => formatPocDateInput(new Date()).slice(0, 7));
  const [events, setEvents] = useState<PocCalendarEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const { from, to } = getPocMonthRange(`${month}-01`);
    fetch(`/api/admin/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error("活動載入失敗"); return payload.data as AdminEvent[]; })
      .then((data) => { setEvents(data.map((event) => ({ id: event.id, title: event.name, description: event.description ?? undefined, descriptionFormat: event.description_format, richDescription: event.rich_description, start: event.start_time, end: event.end_time ?? undefined, cancelled: Boolean(event.cancelled_at), publicationStatus: event.publication_status, calendarColor: event.calendar_color, color: event.cancelled_at ? "red" : event.publication_status === "draft" ? "orange" : "blue" }))); setStatus("ready"); })
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setStatus("error"); });
    return () => controller.abort();
  }, [month]);

  if (status === "error") return <div role="alert" className="rounded-xl border border-(--border-default) p-6"><p>活動載入失敗，請稍後再試。</p><button type="button" className="btn outline mt-3" onClick={() => { setStatus("loading"); setMonth((value) => `${value}`); }}>重試</button></div>;
  if (status === "loading" && events.length === 0) return <div className="poc-calendar-layout" aria-busy="true" aria-label="活動載入中"><div className="poc-calendar-surface skeleton min-h-[28rem]" /><div className="poc-selected-day skeleton min-h-[16rem]" /></div>;

  return <EventCalendar events={events} holidays={holidays} onMonthChange={setMonth} renderEventActions={(event) => <><ButtonLink size="sm" variant="primary" href={`/admin/events/${event.id}`}>查看</ButtonLink><ButtonLink size="sm" variant="outline" href={`/admin/events/${event.id}/edit`}>編輯</ButtonLink><ButtonLink size="sm" variant="outline" href={`/admin/events/${event.id}/attendances`}>簽到管理</ButtonLink></>} />;
}

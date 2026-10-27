"use client";
import { useEffect, useState } from "react";
import { EventCalendar } from "@/components/calendar/EventCalendar";
import { formatPocDateInput, getPocMonthRange, type PocCalendarEvent } from "@/components/calendar/calendar-utils";
import type { CalendarHoliday } from "@/components/calendar/calendar-holidays";
import { Button } from "@/components/ui/Button";
type ApiEvent = { id: string; name: string; description: string | null; description_format: "plain_text" | "rich_text_v1"; rich_description: unknown; start_time: string; end_time: string | null; is_cancelled: boolean; calendar_color: string | null };
function toCalendarEvent(event: ApiEvent): PocCalendarEvent { return { id: event.id, title: event.name, description: event.description ?? undefined, descriptionFormat: event.description_format, richDescription: event.rich_description, start: event.start_time, end: event.end_time ?? undefined, cancelled: event.is_cancelled, calendarColor: event.calendar_color, color: event.is_cancelled ? "red" : "blue" }; }
export function PublicEventCalendar({ holidays }: { holidays: CalendarHoliday[] }) {
  const [events, setEvents] = useState<PocCalendarEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [monthKey, setMonthKey] = useState(() => formatPocDateInput(new Date()).slice(0, 7));
  useEffect(() => {
    const controller = new AbortController();
    const { from, to } = getPocMonthRange(`${monthKey}-01`);
    fetch(`/api/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "活動資料載入失敗"); return payload.data as ApiEvent[]; })
      .then((data) => { setEvents(data.map(toCalendarEvent)); setStatus("ready"); })
      .catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(reason instanceof Error ? reason.message : "活動資料載入失敗"); setStatus("error"); });
    return () => controller.abort();
  }, [monthKey, retryKey]);
  if (status === "error") return <div role="alert" className="rounded-xl border border-(--border-default) p-6"><h2 className="text-base font-semibold text-(--text-primary)">無法載入活動行事曆</h2><p className="mt-2 text-sm text-(--text-secondary)">{error ?? "請稍後再試。"}</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setRetryKey((value) => value + 1)}>重新載入</Button></div>;
  if (status === "loading" && events.length === 0) return <div className="poc-calendar-layout" aria-busy="true" aria-label="載入活動行事曆"><div className="poc-calendar-surface skeleton min-h-[28rem]" /><div className="poc-selected-day skeleton min-h-[16rem]" /></div>;
  return <EventCalendar events={events} holidays={holidays} onMonthChange={setMonthKey} />;
}

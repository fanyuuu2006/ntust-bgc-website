"use client";

import { useEffect, useState } from "react";
import { EventCalendar } from "@/components/calendar/EventCalendar";
import { getPocMonthRange, type PocCalendarEvent } from "@/components/calendar/calendar-utils";

type AdminEvent = { id: string; name: string; description: string | null; description_format: "plain_text" | "rich_text_v1"; rich_description: unknown; start_time: string; end_time: string | null; cancelled_at: string | null; publication_status: "draft" | "published" };

export function AdminEventCalendar() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState<PocCalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const { from, to } = getPocMonthRange(`${month}-01`);
    fetch(`/api/admin/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "活動資料載入失敗"); return payload.data as AdminEvent[]; })
      .then((data) => setEvents(data.map((event) => ({ id: event.id, title: event.name, description: event.description ?? undefined, descriptionFormat: event.description_format, richDescription: event.rich_description, start: event.start_time, end: event.end_time ?? undefined, cancelled: Boolean(event.cancelled_at), publicationStatus: event.publication_status, color: event.cancelled_at ? "red" : event.publication_status === "draft" ? "orange" : "blue" }))))
      .catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(reason instanceof Error ? reason.message : "活動資料載入失敗"); });
    return () => controller.abort();
  }, [month]);
  if (error) return <div role="alert" className="rounded-xl border border-(--border-default) p-6"><p>{error}</p><button type="button" className="btn outline mt-3" onClick={() => setMonth((value) => `${value}`)}>重新載入</button></div>;
  return <EventCalendar events={events} onMonthChange={setMonth} />;
}

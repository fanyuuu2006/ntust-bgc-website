"use client";

import { Modal } from "@/components/Modal";
import { EventDetailsContent } from "@/components/calendar/EventDetailsContent";
import type { PocCalendarEvent } from "@/components/calendar/calendar-utils";

export function EventPreviewModal({ open, onClose, name, start, end, color, description }: { open: boolean; onClose: () => void; name: string; start: string; end: string; color: string | null; description: unknown }) {
  const event: PocCalendarEvent = { id: "preview", title: name.trim() || "未命名活動", start: start || "2000-01-01T00:00:00+08:00", end: end || undefined, calendarColor: color, description: description ? "活動說明" : undefined, descriptionFormat: description ? "rich_text_v1" : undefined, richDescription: description };
  return <Modal open={open} onClose={onClose} title="活動預覽" size="md">
    <EventDetailsContent event={event} datePlaceholder={!start} />
  </Modal>;
}

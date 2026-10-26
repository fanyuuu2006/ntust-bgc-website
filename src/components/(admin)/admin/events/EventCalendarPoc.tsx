"use client";

import { EventCalendar, MOCK_EVENTS } from "@/components/calendar/EventCalendar";

/** Admin PoC adapter: keeps mock data at the PoC boundary while sharing the production Calendar UI. */
export function EventCalendarPoc() {
  return <EventCalendar events={MOCK_EVENTS} />;
}

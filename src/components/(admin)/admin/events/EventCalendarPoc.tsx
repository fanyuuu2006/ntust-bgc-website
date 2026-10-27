"use client";

import { EventCalendar } from "@/components/calendar/EventCalendar";
import { MOCK_EVENTS } from "./calendar-poc-fixtures";

/** Admin PoC adapter: keeps mock data at the PoC boundary while sharing the production Calendar UI. */
export function EventCalendarPoc() {
  return <EventCalendar events={MOCK_EVENTS} />;
}

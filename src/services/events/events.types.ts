import type { z } from "zod";
import type { Event, EventAttendance } from "@/types/database";
import type { createEventSchema, updateEventSchema } from "./events.schema";

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export type SelfCheckInEvent = {
  event: Event;
  attendance: EventAttendance | null;
};

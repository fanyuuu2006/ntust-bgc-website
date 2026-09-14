import type { z } from "zod";
import type { Event, EventAttendance } from "@/types/database";
import type { createEventSchema, updateEventSchema } from "./events.schema";

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export type SelfCheckInEvent = {
  event: Pick<Event, "id" | "name" | "start_time" | "end_time">;
  attendance: Pick<EventAttendance, "event_id"> | null;
};

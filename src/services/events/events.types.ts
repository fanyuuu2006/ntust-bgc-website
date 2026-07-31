import type { z } from "zod";
import type { createEventSchema, updateEventSchema } from "./events.schema";

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

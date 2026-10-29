import { z } from "zod";
import { descriptionFields, validateDescription, canonicalizeDescription } from "@/libs/rich-content/description";
import { recurrenceRuleSchema, RECURRENCE_DEFAULT_TIMEZONE } from "./recurrence";
import { CALENDAR_COLOR_PATTERN } from "@/utils/calendar-color";

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localTime = z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/);

export const createEventSeriesSchema = z.object({
  name: z.string().trim().min(1).max(100),
  ...descriptionFields,
  startDate: localDate,
  startTime: localTime,
  endTime: localTime,
  timezone: z.string().trim().min(1).default(RECURRENCE_DEFAULT_TIMEZONE),
  recurrenceRule: recurrenceRuleSchema,
  calendarColor: z.string().regex(CALENDAR_COLOR_PATTERN).nullable().optional(),
  checkInOpensAt: z.iso.datetime().nullable().optional(),
  checkInClosesAt: z.iso.datetime().nullable().optional(),
  idempotencyKey: z.string().trim().min(8).max(128),
}).superRefine(validateDescription).transform(canonicalizeDescription);

export type CreateEventSeriesInput = z.infer<typeof createEventSeriesSchema>;

import "server-only";

import { createHash } from "node:crypto";
import { eventSeriesRepository } from "@/repositories/event-series.repository";
import { createEventSeriesSchema, type CreateEventSeriesInput } from "./event-series.schema";
import { generateOccurrences } from "./recurrence";

function canonicalize(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
    : item);
}

function requestHash(data: CreateEventSeriesInput): string {
  const payload = { ...data };
  delete payload.idempotencyKey;
  return createHash("sha256").update(canonicalize(payload)).digest("hex");
}

export const eventSeriesService = {
  create: async (actorId: string, payload: unknown) => {
    const data = createEventSeriesSchema.parse(payload);
    const generated = generateOccurrences({
      startDate: data.startDate,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
      recurrenceRule: data.recurrenceRule,
    });
    return eventSeriesRepository.createWithOccurrences({
      actorId,
      idempotencyKey: data.idempotencyKey,
      requestHash: requestHash(data),
      series: {
        name: data.name,
        timezone: data.timezone,
        recurrence_rule: data.recurrenceRule,
        starts_at: generated[0]?.startTime ?? "",
        ends_at: generated.at(-1)?.endTime ?? null,
        occurrence_count: generated.length,
      },
      occurrences: generated.map((occurrence) => ({
        name: data.name,
        description: data.description ?? null,
        description_format: data.description_format ?? "plain_text",
        rich_description: data.rich_description ?? null,
        start_time: occurrence.startTime,
        end_time: occurrence.endTime,
        check_in_opens_at: data.checkInOpensAt ?? null,
        check_in_closes_at: data.checkInClosesAt ?? null,
        calendar_color: data.calendarColor ?? null,
        recurrence_instance_key: occurrence.recurrenceInstanceKey,
        original_start_time: occurrence.startTime,
      })),
    });
  },

  getById: async (id: string) => {
    const series = await eventSeriesRepository.findById(id);
    if (!series) return null;
    return { series, occurrences: await eventSeriesRepository.findOccurrences(id) };
  },
};

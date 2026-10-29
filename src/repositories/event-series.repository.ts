import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import type { Event, EventSeries } from "@/types/database";

export type CreateEventSeriesTransactionInput = {
  actorId: string;
  idempotencyKey: string;
  requestHash: string;
  series: Pick<EventSeries, "name" | "timezone" | "recurrence_rule" | "starts_at" | "ends_at" | "occurrence_count">;
  occurrences: Array<Pick<Event, "name" | "description" | "description_format" | "rich_description" | "start_time" | "end_time" | "check_in_opens_at" | "check_in_closes_at" | "calendar_color" | "recurrence_instance_key" | "original_start_time">>;
};

export const eventSeriesRepository = {
  createWithOccurrences: async (input: CreateEventSeriesTransactionInput) => {
    const { data, error } = await supabase.rpc("create_event_series", {
      p_actor_id: input.actorId,
      p_idempotency_key: input.idempotencyKey,
      p_request_hash: input.requestHash,
      p_series: input.series,
      p_occurrences: input.occurrences,
    });
    if (error) throwRepositoryError("建立活動系列失敗", error);
    return data as { series_id: string; occurrence_ids: string[]; occurrence_count: number };
  },

  findById: async (id: string): Promise<EventSeries | null> => {
    const { data, error } = await supabase.from("event_series").select("*").eq("id", id).maybeSingle();
    if (error) throwRepositoryError("讀取活動系列失敗", error);
    return data;
  },

  findOccurrences: async (seriesId: string): Promise<Event[]> => {
    const { data, error } = await supabase.from("events").select("*").eq("series_id", seriesId).order("start_time", { ascending: true });
    if (error) throwRepositoryError("讀取活動系列場次失敗", error);
    return data ?? [];
  },
};

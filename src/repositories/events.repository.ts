import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "@/repositories/shared/pagination";
import { buildIlikeSearch } from "@/repositories/shared/search";
import { OrderOptions, PaginationQuery } from "@/repositories/shared/types";
import { Event } from "@/types/database";

export type CreateEventInput = Pick<Event, "name" | "start_time" | "end_time"> &
  Partial<Pick<Event, "description">>;

export type UpdateEventInput = Partial<
  Pick<Event, "name" | "description" | "start_time" | "end_time">
>;

export type FindManyEventsOptions = PaginationQuery &
  OrderOptions<"start_time" | "end_time" | "created_at" | "name"> & {
    search?: string;
    status?: "upcoming" | "ongoing" | "ended";
    /** 只取開始時間在此之後的活動，例如「即將舉行」列表 */
    startsAfter?: string;
    /** 只取開始時間在此之前的活動，例如「歷史活動」列表 */
    startsBefore?: string;
  };

export const eventsRepository = {
  findMany: async (options: FindManyEventsOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "start_time";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase.from("events").select("*", { count: "exact" });

    const keyword = options.search?.trim();
    if (keyword) {
      query = query.or(buildIlikeSearch(["name", "description"], keyword));
    }

    if (options.startsAfter) {
      query = query.gte("start_time", options.startsAfter);
    }

    if (options.startsBefore) {
      query = query.lte("start_time", options.startsBefore);
    }

    if (options.status) {
      const now = new Date().toISOString();
      if (options.status === "upcoming") query = query.gt("start_time", now);
      if (options.status === "ongoing") query = query.lte("start_time", now).gte("end_time", now);
      if (options.status === "ended") query = query.lt("end_time", now);
    }

    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得活動列表失敗", error);

    return buildPaginationResult<Event>(data ?? [], count, page, pageSize);
  },

  findById: async (id: string): Promise<Event | null> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwRepositoryError("依 ID 尋找活動失敗", error);
    return data;
  },

  findManyByIds: async (ids: string[]): Promise<Event[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .in("id", ids);
    if (error) throwRepositoryError("依 ID 批次尋找活動失敗", error);
    return data ?? [];
  },

  /**
   * 取得即將舉行的活動（start_time 尚未到），供首頁 / 儀表板等處使用。
   */
  findUpcoming: async (limit = 5): Promise<Event[]> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(limit);
    if (error) throwRepositoryError("取得即將舉行活動失敗", error);
    return data ?? [];
  },

  create: async (payload: CreateEventInput): Promise<Event> => {
    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立活動失敗", error);
    return data;
  },

  updateById: async (
    id: string,
    payload: UpdateEventInput,
  ): Promise<Event | null> => {
    if (Object.keys(payload).length === 0) {
      return eventsRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("更新活動失敗", error);
    return data;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throwRepositoryError("刪除活動失敗", error);
  },
};

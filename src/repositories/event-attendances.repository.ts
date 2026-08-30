import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "@/repositories/shared/pagination";
import { OrderOptions, PaginationQuery } from "@/repositories/shared/types";
import { AttendanceStatus, Event, EventAttendance } from "@/types/database";

export type EventAttendanceWithEvent = EventAttendance & {
  event: Pick<Event, "id" | "name" | "start_time"> | null;
};

type CreateEventAttendanceInput = Pick<
  EventAttendance,
  "user_id" | "event_id"
> &
  Partial<Pick<EventAttendance, "attended_at" | "status">>;

type UpdateEventAttendanceInput = Partial<
  Pick<EventAttendance, "attended_at" | "status">
>;

export type FindManyEventAttendancesOptions = PaginationQuery &
  OrderOptions<"attended_at"> & {
    status?: AttendanceStatus | AttendanceStatus[];
    user_id?: string;
    event_id?: string;
  };

const EVENT_ATTENDANCE_WITH_EVENT_SELECT =
  "*, event:events(id, name, start_time)";

export const eventAttendancesRepository = {
  /**
   * 通用列表查詢，供管理後台（跨使用者、跨活動）使用。
   */
  findMany: async (options: FindManyEventAttendancesOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "attended_at";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase
      .from("event_attendances")
      .select(EVENT_ATTENDANCE_WITH_EVENT_SELECT, { count: "exact" });

    if (options.status) {
      query = Array.isArray(options.status)
        ? query.in("status", options.status)
        : query.eq("status", options.status);
    }

    if (options.user_id) {
      query = query.eq("user_id", options.user_id);
    }

    if (options.event_id) {
      query = query.eq("event_id", options.event_id);
    }

    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得簽到紀錄列表失敗", error);

    return buildPaginationResult<EventAttendanceWithEvent>(
      (data as EventAttendanceWithEvent[] | null) ?? [],
      count,
      page,
      pageSize,
    );
  },

  findById: async (id: string): Promise<EventAttendance | null> => {
    const { data, error } = await supabase
      .from("event_attendances")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throwRepositoryError("依 ID 尋找簽到紀錄失敗", error);
    return data;
  },

  /**
   * 檢查使用者是否已對某活動簽到，避免重複簽到。
   */
  findByUserIdAndEventId: async (
    userId: string,
    eventId: string,
  ): Promise<EventAttendance | null> => {
    const { data, error } = await supabase
      .from("event_attendances")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) throwRepositoryError("檢查使用者簽到狀態失敗", error);
    return data;
  },

  /**
   * 計算使用者的活動出席次數。
   * @param statuses 篩選狀態（例如只算 "present"），不傳則計算所有狀態
   */
  countByUserId: async (
    userId: string,
    statuses?: AttendanceStatus[],
  ): Promise<number> => {
    let query = supabase
      .from("event_attendances")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { count, error } = await query;
    if (error) throwRepositoryError("計算使用者社課簽到次數失敗", error);
    return count ?? 0;
  },


  /**
   * 計算使用者在指定學年度的活動出席次數。
   *
   * event_attendances 本身沒有學年度欄位，是透過關聯的
   * events.start_time 是否落在該學年度的 start_date ~ end_date
   * 區間內來判斷，因此需要先取得該學年度的區間。
   */
  countByUserIdAndAcademicYear: async (
    userId: string,
    academicYearId: string,
    statuses?: AttendanceStatus[],
  ): Promise<number> => {
    const { data: academicYear, error: yearError } = await supabase
      .from("academic_years")
      .select("start_date, end_date")
      .eq("id", academicYearId)
      .single();

    if (yearError || !academicYear) {
      throwRepositoryError("查無此學年度資料", yearError ?? undefined);
    }

    let query = supabase
      .from("event_attendances")
      .select("*, events!inner(start_time)", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("events.start_time", academicYear.start_date)
      .lte("events.start_time", academicYear.end_date);

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { count, error } = await query;
    if (error) throwRepositoryError("計算使用者社課簽到次數失敗", error);
    return count ?? 0;
  },

  create: async (
    payload: CreateEventAttendanceInput,
  ): Promise<EventAttendance> => {
    const { data, error } = await supabase
      .from("event_attendances")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立簽到紀錄失敗", error);
    return data;
  },

  updateById: async (
    id: string,
    payload: UpdateEventAttendanceInput,
  ): Promise<EventAttendance | null> => {
    if (Object.keys(payload).length === 0) {
      return eventAttendancesRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("event_attendances")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("更新簽到紀錄失敗", error);
    return data;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("event_attendances")
      .delete()
      .eq("id", id);
    if (error) throwRepositoryError("刪除簽到紀錄失敗", error);
  },
};

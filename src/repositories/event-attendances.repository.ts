import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { AttendanceStatus } from "@/types/database";

export const eventAttendancesRepository = {
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

    if (error) {
      throwRepositoryError("計算使用者社課簽到次數失敗", error);
    }

    return count ?? 0;
  },

  /**
   * 計算使用者在指定學年度的活動出席次數。
   *
   * event_attendances 本身沒有學年度欄位，
   * 是透過關聯的 events.start_time 是否落在該學年度的
   * start_date ~ end_date 區間內來判斷，因此需要先查一次
   * academic_years 取得區間，再查一次 event_attendances。
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
      .gte("events.start_time", academicYear!.start_date)
      .lte("events.start_time", academicYear!.end_date);

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { count, error } = await query;

    if (error) {
      throwRepositoryError("計算使用者社課簽到次數失敗", error);
    }

    return count ?? 0;
  },
};

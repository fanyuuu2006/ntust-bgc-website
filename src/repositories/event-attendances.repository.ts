import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/error";

export const eventAttendancesRepository = {
  /**
   * 計算使用者的活動出席次數。
   * @param statuses 篩選狀態（例如只算 "present"），不傳則計算所有狀態
   */
  countByUserId: async (
    userId: string,
    statuses?: string[],
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
};

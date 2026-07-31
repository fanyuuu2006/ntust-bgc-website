import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";

export const boardGameBorrowingsRepository = {
  /**
   * 計算使用者的借用紀錄數量。
   * @param status 篩選特定狀態，不傳則計算全部紀錄（含 pending/rejected 等）
   */
  countByUserId: async (
    userId: string,
    statuses?: string[],
  ): Promise<number> => {
    let query = supabase
      .from("board_game_borrowings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { count, error } = await query;

    if (error) {
      throwRepositoryError("計算使用者借用桌遊次數失敗", error);
    }

    return count ?? 0;
  },
};

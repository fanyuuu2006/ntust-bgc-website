import "server-only";
import { supabase } from "@/libs/supabase/server";

export const healthRepository = {
  /** 只確認 Data API 能執行零筆投影；不讀 Session、個資、筆數或資料庫版本。 */
  probe: async (): Promise<boolean> => {
    const { error } = await supabase.from("academic_years")
      .select("id").limit(0).abortSignal(AbortSignal.timeout(3000)).retry(false);
    return !error;
  },
};

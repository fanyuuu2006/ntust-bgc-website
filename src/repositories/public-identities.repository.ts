import "server-only";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "./shared/errors";

type IdentitySource = {
  id: string;
  name: string;
  avatar: string | null;
  closed_at: string | null;
};

export const publicIdentitiesRepository = {
  /** 僅查詢公開身份及內部註銷判斷欄位；不 join 個資／社團紀錄，也不讀取完整 User。 */
  findById: async (id: string): Promise<IdentitySource | null> => {
    const { data, error } = await supabase.from("users")
      .select("id,name,avatar,closed_at").eq("id", id).maybeSingle();
    if (error) throwRepositoryError("取得公開使用者身份失敗", error);
    return data;
  },
};

import "server-only";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "./shared/errors";
import type { BadgeMembership, BadgeOfficer } from "@/libs/profile-presentation";

/** 僅取得身份摘要所需欄位；分頁讀完以免多學年度紀錄被 API 上限截斷。 */
async function readAll<T>(table: "memberships" | "officer_positions", fields: string, id: string): Promise<T[]> {
  const result: T[] = [];
  for (let from = 0; ; from += 100) {
    const { data, error } = await supabase.from(table).select(fields)
      .eq("user_id", id).order(table === "memberships" ? "joined_at" : "created_at", { ascending: false })
      .order("id", { ascending: true }).range(from, from + 99);
    if (error) throwRepositoryError("取得公開社團身份摘要失敗", error);
    const rows = (data ?? []) as unknown as T[];
    result.push(...rows);
    if (rows.length < 100) return result;
  }
}
export const publicFootprintsRepository = {
  findMemberships: (id: string) => readAll<BadgeMembership>("memberships", "id,status,academic_year_id,academic_year:academic_years(year,start_date)", id),
  findOfficers: (id: string) => readAll<BadgeOfficer>("officer_positions", "id,title,academic_year:academic_years(year,start_date)", id),
};

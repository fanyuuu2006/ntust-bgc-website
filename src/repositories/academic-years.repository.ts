import "server-only";

import { supabase } from "@/libs/supabase/server";
import { AcademicYear } from "@/types/database";
import { throwRepositoryError } from "./error";

type CreateAcademicYearInput = Pick<
  AcademicYear,
  "year" | "start_date" | "end_date"
>;

type UpdateAcademicYearInput = Partial<
  Pick<AcademicYear, "year" | "start_date" | "end_date">
>;

/**
 * academic-year repository
 *
 * 只做 academic_years 這張表的存取。
 *
 * 注意：is_current 刻意不開放透過 create / updateById 直接寫入。
 * 「同時只能有一個學年度是目前學年度」是這張表內部的一致性規則，
 * 統一交給 setCurrent() 處理，避免呼叫端各自 update 造成
 * 兩筆 is_current = true 同時存在（會讓 findCurrent() 噴錯）。
 *
 * 建議另外在 DB 加一個 partial unique index 當最後防線：
 *   CREATE UNIQUE INDEX ON academic_years (is_current) WHERE is_current = true;
 */
export const academicYearsRepository = {
  /**
   * 取得所有學年度（依開始日期新到舊排序）
   */
  findMany: async (): Promise<AcademicYear[]> => {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      throwRepositoryError("取得學年度列表失敗", error);
    }

    return data ?? [];
  },

  /**
   * 取得目前學年度（is_current = true）
   * 正常情況下最多只有一筆，用 maybeSingle 而非 single，
   * 避免資料異常（0 筆或忘記切換）時直接丟不明確的錯誤。
   */
  findCurrent: async (): Promise<AcademicYear | null> => {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_current", true)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得目前學年度失敗", error);
    }

    return data;
  },

  /**
   * 依 ID 查詢學年度
   */
  findById: async (id: string): Promise<AcademicYear | null> => {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得學年度資料失敗", error);
    }

    return data;
  },

  /**
   * 建立學年度（一律建立為非目前學年度，要設為目前請呼叫 setCurrent）
   */
  create: async (payload: CreateAcademicYearInput): Promise<AcademicYear> => {
    const { data, error } = await supabase
      .from("academic_years")
      .insert({ ...payload, is_current: false })
      .select()
      .single();

    if (error) {
      throwRepositoryError("建立學年度資料失敗", error);
    }

    return data;
  },

  /**
   * 更新學年度基本資料（不含 is_current，切換目前學年度請用 setCurrent）
   */
  updateById: async (
    id: string,
    payload: UpdateAcademicYearInput,
  ): Promise<AcademicYear | null> => {
    if (Object.keys(payload).length === 0) {
      return academicYearsRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("academic_years")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throwRepositoryError("更新學年度資料失敗", error);
    }

    return data;
  },

  /**
   * 將指定學年度設為目前學年度，並取消其他學年度的目前狀態。
   *
   * 注意：這裡是兩個各自獨立的 update，不是同一個 DB transaction，
   * 理論上有極短暫的時間窗口（兩個 request 幾乎同時呼叫）可能造成不一致。
   * 如果之後這個操作變頻繁、或一致性要求提高，建議改寫成一個
   * Postgres function（在同一個 transaction 內做 unset + set），
   * 用 supabase.rpc(...) 呼叫，也能省成一次 round trip。
   *
   * 第二個 update 用 .single()：如果 id 不存在，PostgREST 會回傳
   * 找不到 row 的錯誤，不需要另外多打一次 findById 去檢查是否存在。
   */
  setCurrent: async (id: string): Promise<AcademicYear> => {
    const { error: unsetError } = await supabase
      .from("academic_years")
      .update({ is_current: false })
      .eq("is_current", true);

    if (unsetError) {
      throwRepositoryError(
        "設定目前學年度失敗（取消舊的目前學年度）",
        unsetError,
      );
    }

    const { data, error: setError } = await supabase
      .from("academic_years")
      .update({ is_current: true })
      .eq("id", id)
      .select()
      .single();

    if (setError) {
      throwRepositoryError(
        "設定目前學年度失敗（找不到指定學年度或寫入失敗）",
        setError,
      );
    }

    return data;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("academic_years")
      .delete()
      .eq("id", id);

    if (error) {
      throwRepositoryError("刪除學年度資料失敗", error);
    }
  },
};

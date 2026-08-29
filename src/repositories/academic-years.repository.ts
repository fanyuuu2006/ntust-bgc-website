import "server-only";

import { supabase } from "@/libs/supabase/server";
import { AcademicYear } from "@/types/database";
import { throwRepositoryError } from "./shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "./shared/pagination";
import { buildIlikeSearch } from "./shared/search";
import type { PaginationQuery } from "./shared/types";

export type FindManyAcademicYearsOptions = PaginationQuery & {
  search?: string;
};

export type CreateAcademicYearInput = Pick<
  AcademicYear,
  "year" | "start_date" | "end_date"
>;

export type UpdateAcademicYearInput = Partial<
  Pick<AcademicYear, "year" | "start_date" | "end_date">
>;

export const academicYearsRepository = {
  findMany: async (): Promise<AcademicYear[]> => {
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .order("year", { ascending: false });

    if (error) {
      throwRepositoryError("取得學年度列表失敗", error);
    }

    return data ?? [];
  },

  findManyForAdmin: async (options: FindManyAcademicYearsOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions(options);
    let query = supabase.from("academic_years").select("*", { count: "exact" });
    const search = options.search?.trim();
    if (search) query = query.or(buildIlikeSearch(["year"], search));
    const { data, error, count } = await query
      .order("year", { ascending: false })
      .range(from, to);
    if (error) throwRepositoryError("讀取學年度管理清單失敗", error);
    return buildPaginationResult<AcademicYear>(data ?? [], count, page, pageSize);
  },

  findManyByIds: async (ids: string[]): Promise<AcademicYear[]> => {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .in("id", ids);

    if (error) {
      throwRepositoryError("依 ID 批次取得學年度失敗", error);
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

  existsByYear: async (year: string, excludeId?: string): Promise<boolean> => {
    let query = supabase.from("academic_years").select("id", { count: "exact", head: true }).eq("year", year);
    if (excludeId) query = query.neq("id", excludeId);
    const { count, error } = await query;
    if (error) throwRepositoryError("檢查學年度是否重複失敗", error);
    return (count ?? 0) > 0;
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

import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/error";
import type { OfficerPosition, UUID } from "@/types/database";
import { OfficerPositionWithAcademicYear } from "@/services/users/users.types";

type CreateOfficerPositionInput = Omit<
  OfficerPosition,
  "id" | "created_at" | "updated_at"
>;

type UpdateOfficerPositionInput = Partial<CreateOfficerPositionInput>;

/**
 * 查詢多筆時的排序 / 筆數限制選項。
 * 統一以 created_at 排序（officer_positions 沒有 joined_at 這種欄位，
 * created_at 就是這筆職位紀錄成立的時間點）。
 */
type FindManyOfficerPositionsOptions = Partial<{
  /** 排序方向，預設 "desc"（最新的在前面） */
  order: "asc" | "desc";
  /** 限制回傳筆數，不傳則撈全部 */
  limit: number;
}>;

export const officerPositionsRepository = {
  /**
   * 取得使用者的幹部職位紀錄（附帶學年度資料），依 created_at 排序。
   *
   * 用 join 直接帶出 academic_year，避免呼叫端再對每筆
   * 各自查一次學年度資料（N+1 query）。
   *
   * @param options.order 排序方向，預設 "desc"
   * @param options.limit 限制筆數，不傳則撈全部
   */
  findManyByUserId: async (
    userId: UUID,
    options: FindManyOfficerPositionsOptions = {},
  ): Promise<OfficerPositionWithAcademicYear[]> => {
    const { order = "desc", limit } = options;

    let query = supabase
      .from("officer_positions")
      .select("*, academic_year:academic_years!inner(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: order === "asc" });

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throwRepositoryError("取得使用者幹部職位紀錄失敗", error);
    }

    return (data ?? []) as OfficerPositionWithAcademicYear[];
  },

  /**
   * 依 ID 查詢幹部職位
   */
  findById: async (id: UUID): Promise<OfficerPosition | null> => {
    const { data, error } = await supabase
      .from("officer_positions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得幹部職位資料失敗", error);
    }

    return data;
  },

  /**
   * 取得使用者「目前學年度」的幹部職位，若非現任幹部則回傳 []。
   * 依 academic_years.is_current 判斷目前學年度，不可 hardcode 學年度 ID。
   */
  findCurrentByUserId: async (
    userId: UUID,
  ): Promise<OfficerPositionWithAcademicYear[]> => {
    const { data, error } = await supabase
      .from("officer_positions")
      .select("*, academic_year:academic_years!inner(*)")
      .eq("user_id", userId)
      .eq("academic_years.is_current", true);

    if (error) {
      throwRepositoryError("取得使用者目前幹部職位失敗", error);
    }

    return (data ?? []) as OfficerPositionWithAcademicYear[];
  },

  /**
   * 建立幹部職位
   */
  create: async (
    payload: CreateOfficerPositionInput,
  ): Promise<OfficerPosition> => {
    const { data, error } = await supabase
      .from("officer_positions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throwRepositoryError("建立幹部職位失敗", error);
    }

    return data;
  },

  /**
   * 更新幹部職位
   */
  updateById: async (
    id: UUID,
    payload: UpdateOfficerPositionInput,
  ): Promise<OfficerPosition | null> => {
    if (Object.keys(payload).length === 0) {
      return officerPositionsRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("officer_positions")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throwRepositoryError("更新幹部職位失敗", error);
    }

    return data;
  },

  deleteById: async (id: UUID): Promise<void> => {
    const { error } = await supabase
      .from("officer_positions")
      .delete()
      .eq("id", id);

    if (error) {
      throwRepositoryError("刪除幹部職位失敗", error);
    }
  },
};
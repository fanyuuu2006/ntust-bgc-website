import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/error";
import type { AcademicYear, OfficerPosition, UUID } from "@/types/database";

export type OfficerPositionWithAcademicYear = OfficerPosition & {
  academic_years: AcademicYear;
};

type CreateOfficerPositionInput = Omit<
  OfficerPosition,
  "id" | "created_at" | "updated_at"
>;

type UpdateOfficerPositionInput = Partial<CreateOfficerPositionInput>;

export const officerPositionsRepository = {
  /**
   * 取得使用者所有幹部職位紀錄（含歷屆）
   */
  findManyByUserId: async (userId: UUID): Promise<OfficerPosition[]> => {
    const { data, error } = await supabase
      .from("officer_positions")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throwRepositoryError("取得使用者幹部職位紀錄失敗", error);
    }

    return data ?? [];
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
      .select("*, academic_years!inner(*)")
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

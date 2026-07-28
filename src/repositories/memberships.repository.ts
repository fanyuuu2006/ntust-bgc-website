import "server-only";

import { supabase } from "@/libs/supabase/server";
import type { Membership } from "@/types/database";
import { throwRepositoryError } from "./error";
import { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";

type CreateMembershipInput = Pick<
  Membership,
  "user_id" | "type" | "academic_year_id" | "status" | "joined_at"
>;

type UpdateMembershipInput = Partial<Pick<Membership, "type" | "status">>;

/**
 * memberships repository
 *
 * 純粹只做 memberships 這張表的 CRUD。
 * 「目前學年度」「目前社員」這類需要跨表判斷的規則，
 * 統一在這裡用 join 處理（比照 officerPositionsRepository.findCurrentByUserId 的寫法），
 * 避免呼叫端各自組合查詢邏輯、或誤用其他方法（例如把 userId 當成 membership id 查）。
 */
export const membershipsRepository = {
  /**
   * 取得使用者所有社員紀錄
   */
  findManyByUserId: async (userId: string): Promise<Membership[]> => {
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throwRepositoryError("取得使用者社員紀錄失敗", error);
    }

    return data ?? [];
  },

  /**
   * 依 ID 查詢社員紀錄
   */
  findById: async (id: string): Promise<Membership | null> => {
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得社員資料失敗", error);
    }

    return data;
  },

  /**
   * 依使用者 + 指定學年度查詢社員資格
   * （「指定學年度」是哪一年由呼叫端決定，這裡只單純過濾）
   */
  findByUserIdAndAcademicYearId: async (
    userId: string,
    academicYearId: string,
  ): Promise<Membership | null> => {
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("academic_year_id", academicYearId)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得指定學年度社員資格失敗", error);
    }

    return data;
  },

  /**
   * 取得使用者「目前學年度」的社員資格，非目前學年度社員則回傳 null。
   * 依 academic_years.is_current 判斷，不可 hardcode 學年度 ID。
   */
  findCurrentByUserId: async (
    userId: string,
  ): Promise<MembershipWithAcademicYear | null> => {
    const { data, error } = await supabase
      .from("memberships")
      .select("*, academic_year:academic_years!inner(*)")
      .eq("user_id", userId)
      .eq("academic_years.is_current", true)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得使用者目前社員資格失敗", error);
    }

    return data as MembershipWithAcademicYear | null;
  },

  /**
   * 建立社員資格
   */
  create: async (payload: CreateMembershipInput): Promise<Membership> => {
    const { data, error } = await supabase
      .from("memberships")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throwRepositoryError("建立社員資格失敗", error);
    }

    return data;
  },

  /**
   * 更新社員資格
   */
  updateById: async (
    id: string,
    payload: UpdateMembershipInput,
  ): Promise<Membership | null> => {
    if (Object.keys(payload).length === 0) {
      return membershipsRepository.findById(id);
    }

    const { data, error } = await supabase
      .from("memberships")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throwRepositoryError("更新社員資格失敗", error);
    }

    return data;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase.from("memberships").delete().eq("id", id);

    if (error) {
      throwRepositoryError("刪除社員資格失敗", error);
    }
  },
};

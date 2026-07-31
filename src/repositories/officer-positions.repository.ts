import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "@/repositories/shared/pagination";
import type {
  OrderOptions,
  PaginationQuery,
} from "@/repositories/shared/types";
import type { OfficerPosition, UUID } from "@/types/database";

type CreateOfficerPositionInput = Omit<
  OfficerPosition,
  "id" | "created_at" | "updated_at"
>;

type UpdateOfficerPositionInput = Partial<CreateOfficerPositionInput>;

export type FindManyOfficerPositionsOptions = PaginationQuery &
  OrderOptions<"created_at">;

export const officerPositionsRepository = {
  /**
   * 取得使用者的幹部職位紀錄，依 created_at 排序。
   * 只回傳 officer_positions table 本身的資料，不 join 其他 table。
   * 需要 academic_year 資料請由呼叫端（Service）另外組合。
   */
  findManyByUserId: async (
    userId: UUID,
    options: FindManyOfficerPositionsOptions = {},
  ) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });

    const orderDirection = options.orderDirection ?? "desc";

    const { data, error, count } = await supabase
      .from("officer_positions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: orderDirection === "asc" })
      .range(from, to);

    if (error) {
      throwRepositoryError("取得使用者幹部職位紀錄失敗", error);
    }

    return buildPaginationResult<OfficerPosition>(
      data ?? [],
      count,
      page,
      pageSize,
    );
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
   * 取得使用者在指定學年度的幹部職位（可能同時擔任多個職位，故回傳陣列）。
   * 純粹依 academic_year_id 這個欄位過濾，是否為「目前學年度」由呼叫端決定。
   */
  findManyByUserIdAndAcademicYearId: async (
    userId: UUID,
    academicYearId: UUID,
  ): Promise<OfficerPosition[]> => {
    const { data, error } = await supabase
      .from("officer_positions")
      .select("*")
      .eq("user_id", userId)
      .eq("academic_year_id", academicYearId);

    if (error) {
      throwRepositoryError("取得指定學年度幹部職位失敗", error);
    }

    return data ?? [];
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

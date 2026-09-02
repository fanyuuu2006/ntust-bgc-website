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

type CreateOfficerPositionInput = Pick<
  OfficerPosition,
  "user_id" | "academic_year_id" | "title"
>;

type UpdateOfficerPositionInput = Pick<
  OfficerPosition,
  "academic_year_id" | "title"
>;

export type FindManyOfficerPositionsOptions = PaginationQuery &
  OrderOptions<"created_at"> & {
    academicYearId?: UUID;
    userId?: UUID;
    titleSearch?: string;
  };

export const officerPositionsRepository = {
  findUserIdsByUserIds: async (userIds: UUID[]): Promise<UUID[]> => {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("officer_positions")
      .select("user_id")
      .in("user_id", userIds);

    if (error) {
      throwRepositoryError("批次讀取使用者幹部紀錄失敗", error);
    }

    return [...new Set((data ?? []).map((position) => position.user_id))];
  },
  findMany: async (options: FindManyOfficerPositionsOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions(options);
    let query = supabase.from("officer_positions").select("*", { count: "exact" });
    if (options.academicYearId) query = query.eq("academic_year_id", options.academicYearId);
    if (options.userId) query = query.eq("user_id", options.userId);
    if (options.titleSearch?.trim()) {
      query = query.ilike(
        "title",
        `%${options.titleSearch.trim().replace(/[%,_]/g, "")}%`,
      );
    }
    const { data, error, count } = await query.order("created_at", { ascending: options.orderDirection === "asc" }).range(from, to);
    if (error) throwRepositoryError("讀取幹部職位失敗", error);
    return buildPaginationResult<OfficerPosition>(data ?? [], count, page, pageSize);
  },
  countByAcademicYearId: async (academicYearId: UUID): Promise<number> => {
    const { count, error } = await supabase
      .from("officer_positions")
      .select("id", { count: "exact", head: true })
      .eq("academic_year_id", academicYearId);
    if (error) throwRepositoryError("統計學年度幹部職位失敗", error);
    return count ?? 0;
  },
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
    const { data, error } = await supabase.rpc("create_officer_position", {
      p_user_id: payload.user_id,
      p_academic_year_id: payload.academic_year_id,
      p_title: payload.title,
    });

    if (error) {
      throwRepositoryError("以交易方式建立幹部職位失敗", error);
    }

    if (!data) {
      throwRepositoryError(
        "以交易方式建立幹部職位未回傳資料",
        new Error("create_officer_position returned no row"),
      );
    }

    return data as OfficerPosition;
  },

  /**
   * 更新幹部職位
   */
  updateById: async (
    id: UUID,
    payload: UpdateOfficerPositionInput,
  ): Promise<OfficerPosition | null> => {
    const { data, error } = await supabase.rpc("update_officer_position", {
      p_officer_position_id: id,
      p_academic_year_id: payload.academic_year_id,
      p_title: payload.title,
    });

    if (error) {
      throwRepositoryError("以交易方式更新幹部職位失敗", error);
    }

    return (data ?? null) as OfficerPosition | null;
  },

  deleteById: async (id: UUID): Promise<void> => {
    const { error } = await supabase.rpc("delete_officer_position", {
      p_officer_position_id: id,
    });

    if (error) {
      throwRepositoryError("以交易方式刪除幹部職位失敗", error);
    }
  },

  existsByUserId: async (userId: UUID): Promise<boolean> => {
    const { count, error } = await supabase
      .from("officer_positions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      throwRepositoryError("檢查使用者是否曾任幹部失敗", error);
    }

    return (count ?? 0) > 0;
  },
};

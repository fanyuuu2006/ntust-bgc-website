import "server-only";

import { supabase } from "@/libs/supabase/server";
import type { Membership } from "@/types/database";
import { throwRepositoryError } from "./shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "./shared/pagination";
import { OrderOptions, PaginationQuery } from "./shared/types";

type CreateMembershipInput = Pick<
  Membership,
  "user_id" | "type" | "academic_year_id" | "status" | "joined_at"
>;

type UpdateMembershipInput = Partial<Pick<Membership, "type" | "status">>;

export type FindManyMembershipsOptions = PaginationQuery &
  OrderOptions<"joined_at" | "created_at">;

export const membershipsRepository = {
  /**
   * 取得使用者的社員紀錄，依 joined_at 排序。
   * 只回傳 memberships table 本身的資料，不 join 其他 table。
   * 需要 academic_year 資料請由呼叫端（Service）另外組合。
   */
  findManyByUserId: async (
    userId: string,
    options: FindManyMembershipsOptions = {},
  ) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });

    const orderBy = options.orderBy ?? "joined_at";
    const orderDirection = options.orderDirection ?? "desc";

    const { data, error, count } = await supabase
      .from("memberships")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    if (error) {
      throwRepositoryError("取得使用者社員紀錄失敗", error);
    }

    return buildPaginationResult<Membership>(data ?? [], count, page, pageSize);
  },

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

import "server-only";

import { supabase } from "@/libs/supabase/server";
import type { Membership, MembershipStatus, MembershipType } from "@/types/database";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "./shared/pagination";
import { throwRepositoryError } from "./shared/errors";
import type { OrderOptions, PaginationQuery } from "./shared/types";

type CreateMembershipInput = Pick<
  Membership,
  | "user_id"
  | "type"
  | "academic_year_id"
  | "status"
  | "joined_at"
  | "membership_register_key_id"
>;

type UpdateMembershipInput = Partial<
  Pick<
    Membership,
    "type" | "status" | "user_id" | "academic_year_id" | "joined_at" | "membership_register_key_id"
  >
>;

export type FindManyMembershipsOptions = PaginationQuery &
  OrderOptions<"joined_at" | "created_at">;

export type FindManyAdminMembershipsOptions = PaginationQuery &
  OrderOptions<"joined_at" | "created_at" | "status"> & {
    academicYearId?: string;
    userIds?: string[];
    type?: MembershipType;
    status?: MembershipStatus;
  };

export const membershipsRepository = {
  countByAcademicYearId: async (academicYearId: string): Promise<number> => {
    const { count, error } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("academic_year_id", academicYearId);
    if (error) throwRepositoryError("統計學年度社員資格失敗", error);
    return count ?? 0;
  },
  findManyForAdmin: async (options: FindManyAdminMembershipsOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "joined_at";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase
      .from("memberships")
      .select("*", { count: "exact" })
      .filter("user_id", "not.is", null);

    if (options.academicYearId) {
      query = query.eq("academic_year_id", options.academicYearId);
    }

    if (options.type) {
      query = query.eq("type", options.type);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.userIds) {
      if (options.userIds.length === 0) {
        return buildPaginationResult<Membership>([], 0, page, pageSize);
      }
      query = query.in("user_id", options.userIds);
    }

    const { data, error, count } = await query
      .order(orderBy, {
        ascending: orderDirection === "asc",
        nullsFirst: false,
      })
      .range(from, to);

    if (error) {
      throwRepositoryError("查詢社員資格列表失敗", error);
    }

    return buildPaginationResult<Membership>(data ?? [], count, page, pageSize);
  },

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
      throwRepositoryError("查詢使用者社員資格失敗", error);
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
      throwRepositoryError("依 ID 尋找社員資格失敗", error);
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
      throwRepositoryError("依使用者與學年度尋找社員資格失敗", error);
    }

    return data;
  },

  findAnnualByUserIdAndAcademicYearId: async (
    userId: string,
    academicYearId: string,
    excludeId?: string,
  ): Promise<Membership | null> => {
    let query = supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("academic_year_id", academicYearId)
      .eq("type", "annual")
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throwRepositoryError("檢查年度社員資格是否重複失敗", error);
    return data;
  },

  findActiveOrSuspendedByUserIdAndAcademicYearId: async (
    userId: string,
    academicYearId: string,
  ): Promise<Membership | null> => {
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("academic_year_id", academicYearId)
      .in("status", ["active", "suspended"])
      .maybeSingle();

    if (error) {
      throwRepositoryError("查詢目前有效或停權社員資格失敗", error);
    }

    return data;
  },

  findActiveLifetimeByUserId: async (
    userId: string,
    excludeId?: string,
  ): Promise<Membership | null> => {
    let query = supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "lifetime")
      .in("status", ["pending", "active", "suspended"]);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();

    if (error) {
      throwRepositoryError("查詢永久社員資格失敗", error);
    }

    return data;
  },

  findManyActiveByUserIds: async (userIds: string[]): Promise<Membership[]> => {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .in("user_id", userIds)
      .eq("status", "active");

    if (error) {
      throwRepositoryError("取得使用者有效社員資格失敗", error);
    }

    return data ?? [];
  },

  findManyByRegisterKeyIds: async (
    registerKeyIds: string[],
  ): Promise<Membership[]> => {
    if (registerKeyIds.length === 0) return [];

    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .in("membership_register_key_id", registerKeyIds);

    if (error) {
      throwRepositoryError("依註冊序號查詢社員資格失敗", error);
    }

    return data ?? [];
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

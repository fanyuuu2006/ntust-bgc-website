import "server-only";

import { supabase } from "@/libs/supabase/server";
import type { Membership, MembershipStatus, MembershipType } from "@/types/database";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "./shared/pagination";
import { throwRepositoryError } from "./shared/errors";
import type { OrderOptions, PaginationQuery } from "./shared/types";

type CreateAdminMembershipInput = Pick<
  Membership,
  "user_id" | "academic_year_id" | "status"
> & { joined_at?: Membership["joined_at"] | undefined };

type UpdateAdminMembershipInput = Pick<
  Membership,
  "academic_year_id" | "status"
> & { joined_at?: Membership["joined_at"] | undefined };

export type FindManyMembershipsOptions = PaginationQuery &
  OrderOptions<"joined_at" | "created_at"> & {
    type?: MembershipType;
    status?: MembershipStatus;
  };

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

    let query = supabase
      .from("memberships")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (options.type) {
      query = query.eq("type", options.type);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error, count } = await query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    if (error) {
      throwRepositoryError("查詢使用者社員資格失敗", error);
    }

    return buildPaginationResult<Membership>(data ?? [], count, page, pageSize);
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
      throwRepositoryError("取得本學年度社員資格失敗", error);
    }

    return data;
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

  createForAdmin: async (
    payload: CreateAdminMembershipInput,
  ): Promise<Membership> => {
    const { data, error } = await supabase.rpc("create_admin_membership", {
      p_user_id: payload.user_id,
      p_academic_year_id: payload.academic_year_id,
      p_status: payload.status,
      p_joined_at: payload.joined_at ?? null,
    });

    if (error) throwRepositoryError("以交易方式建立社員資格失敗", error);
    if (!data) {
      throwRepositoryError(
        "以交易方式建立社員資格未回傳資料",
        new Error("create_admin_membership returned no row"),
      );
    }
    return data as Membership;
  },

  updateForAdmin: async (
    id: string,
    payload: UpdateAdminMembershipInput,
  ): Promise<Membership | null> => {
    const { data, error } = await supabase.rpc("update_admin_membership", {
      p_membership_id: id,
      p_academic_year_id: payload.academic_year_id,
      p_status: payload.status,
      p_joined_at: payload.joined_at ?? null,
    });

    if (error) throwRepositoryError("以交易方式更新社員資格失敗", error);
    return (data ?? null) as Membership | null;
  },

  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase.from("memberships").delete().eq("id", id);

    if (error) {
      throwRepositoryError("刪除社員資格失敗", error);
    }
  },
};

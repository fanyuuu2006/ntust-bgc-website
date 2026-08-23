import "server-only";

import { supabase } from "@/libs/supabase/server";
import type {
  Membership,
  MembershipRegisterKey,
  MembershipRegisterKeyStatus,
} from "@/types/database";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "./shared/pagination";
import { throwRepositoryError } from "./shared/errors";
import type { OrderOptions, PaginationQuery } from "./shared/types";

export type FindManyRegisterKeysOptions = PaginationQuery &
  OrderOptions<"created_at" | "claimed_at" | "sequence_number"> & {
    academicYearId?: string;
    search?: string;
    status?: MembershipRegisterKeyStatus;
  };

export type GenerateMembershipRegisterKeysInput = {
  academicYearId: string;
  count: number;
  secret: string;
  createdByUserId: string;
};

export type ClaimMembershipRegisterKeyResult =
  | { result: "claimed"; membership: Membership }
  | {
      result:
        | "not_found"
        | "not_current_year"
        | "unavailable"
        | "already_lifetime_member"
        | "already_current_member";
      membership: null;
    };

type ClaimMembershipRegisterKeyRpcRow = {
  result: ClaimMembershipRegisterKeyResult["result"];
  id: string | null;
  user_id: string | null;
  type: Membership["type"] | null;
  academic_year_id: string | null;
  status: Membership["status"] | null;
  created_at: string | null;
  updated_at: string | null;
  joined_at: string | null;
  membership_register_key_id: string | null;
};

export const membershipRegisterKeysRepository = {
  revokeAvailableById: async (id: string): Promise<MembershipRegisterKey | null> => {
    const { data, error } = await supabase
      .from("membership_register_keys")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "available")
      .select()
      .maybeSingle();
    if (error) throwRepositoryError("撤銷社員註冊碼失敗", error);
    return data;
  },
  findMany: async (options: FindManyRegisterKeysOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
    });
    const orderBy = options.orderBy ?? "created_at";
    const orderDirection = options.orderDirection ?? "desc";

    let query = supabase
      .from("membership_register_keys")
      .select("*", { count: "exact" });

    if (options.academicYearId) {
      query = query.eq("academic_year_id", options.academicYearId);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.search) {
      query = query.ilike("register_key", `%${options.search}%`);
    }

    const { data, error, count } = await query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(from, to);

    if (error) {
      throwRepositoryError("查詢社員註冊序號失敗", error);
    }

    return buildPaginationResult<MembershipRegisterKey>(
      data ?? [],
      count,
      page,
      pageSize,
    );
  },

  findByRegisterKey: async (
    registerKey: string,
  ): Promise<MembershipRegisterKey | null> => {
    const { data, error } = await supabase
      .from("membership_register_keys")
      .select("*")
      .eq("register_key", registerKey)
      .maybeSingle();

    if (error) {
      throwRepositoryError("依序號尋找社員註冊序號失敗", error);
    }

    return data;
  },

  generateMany: async ({
    academicYearId,
    count,
    secret,
    createdByUserId,
  }: GenerateMembershipRegisterKeysInput): Promise<MembershipRegisterKey[]> => {
    const { data, error } = await supabase.rpc(
      "generate_membership_register_keys",
      {
        p_academic_year_id: academicYearId,
        p_count: count,
        p_secret: secret,
        p_created_by_user_id: createdByUserId,
      },
    );

    if (error) {
      throwRepositoryError("產生社員註冊序號失敗", error);
    }

    return (data ?? []) as MembershipRegisterKey[];
  },

  claimByRegisterKey: async (
    registerKey: string,
    userId: string,
  ): Promise<ClaimMembershipRegisterKeyResult> => {
    const { data, error } = await supabase.rpc(
      "claim_membership_register_key",
      {
        p_register_key: registerKey,
        p_user_id: userId,
      },
    );

    if (error) {
      throwRepositoryError("啟用社員註冊序號失敗", error);
    }

    const row = ((data ?? [])[0] ?? {
      result: "not_found",
    }) as ClaimMembershipRegisterKeyRpcRow;

    if (row.result !== "claimed") {
      return { result: row.result, membership: null };
    }

    if (
      !row.id ||
      !row.user_id ||
      !row.type ||
      !row.academic_year_id ||
      !row.status ||
      !row.created_at ||
      !row.updated_at
    ) {
      throwRepositoryError("啟用社員註冊序號回傳資料不完整", row);
    }

    return {
      result: "claimed",
      membership: {
        id: row.id,
        user_id: row.user_id,
        type: row.type,
        academic_year_id: row.academic_year_id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        joined_at: row.joined_at,
        membership_register_key_id: row.membership_register_key_id,
      },
    };
  },
};

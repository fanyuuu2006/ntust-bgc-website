import "server-only";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { buildPaginationResult, normalizePaginationOptions } from "@/repositories/shared/pagination";
import type { CreatePurchaseSuggestionInput, PurchaseSuggestionQuery } from "@/services/purchase-suggestions/purchase-suggestions.schema";
import type { AdminPurchaseSuggestionItem, PurchaseSuggestionItem, PurchaseNotice } from "@/services/purchase-suggestions/purchase-suggestions.types";

const TABLE = "board_game_purchase_suggestions";
const OWN_FIELDS = "id,game_name,reason,reference_url,status,created_at,purchase_notice_version,purchase_notice_unread";

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throwRepositoryError("處理桌遊購入建議失敗", error);
  return data;
}

export const purchaseSuggestionsRepository = {
  submit: (userId: string, input: CreatePurchaseSuggestionInput) => rpc("submit_board_game_purchase_suggestion", {
    p_user_id: userId, p_request_id: input.request_id, p_game_name: input.game_name,
    p_reason: input.reason, p_reference_url: input.reference_url,
  }),
  manage: (actorId: string, id: string, version: number, action: string) => rpc("manage_board_game_purchase_suggestion", {
    p_actor_id: actorId, p_id: id, p_version: version, p_action: action,
  }),
  readNotice: (userId: string, id: string, noticeVersion: number) => rpc("read_board_game_purchase_notice", {
    p_user_id: userId, p_id: id, p_notice_version: noticeVersion,
  }),
  countForWeek: async (userId: string, start: string, end: string) => {
    const { count, error } = await supabase.from(TABLE).select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", start).lt("created_at", end);
    if (error) throwRepositoryError("讀取推薦額度失敗", error);
    return count ?? 0;
  },
  listOwn: async (userId: string, options: PurchaseSuggestionQuery) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({ ...options, maxPageSize: 50 });
    const { data, error, count } = await supabase.from(TABLE).select(OWN_FIELDS, { count: "exact" })
      .eq("user_id", userId).is("deleted_at", null)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);
    if (error) throwRepositoryError("讀取自己的推薦失敗", error);
    return buildPaginationResult<PurchaseSuggestionItem>(data ?? [], count, page, pageSize);
  },
  listAdmin: async (options: PurchaseSuggestionQuery) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({ ...options, maxPageSize: 50 });
    let query = supabase.from(TABLE).select(`${OWN_FIELDS},version,reviewed_at,reviewed_by_user_id`, { count: "exact" }).is("deleted_at", null);
    if (options.status !== "all") query = query.eq("status", options.status);
    if (options.search) query = query.ilike("game_name", `%${options.search.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error, count } = await query.order("created_at", { ascending: options.status === "pending" })
      .order("id", { ascending: options.status === "pending" }).range(from, to);
    if (error) throwRepositoryError("讀取管理端推薦失敗", error);
    return buildPaginationResult<AdminPurchaseSuggestionItem>(data ?? [], count, page, pageSize);
  },
  notices: async (userId: string) => {
    const { data, error, count } = await supabase.from(TABLE).select("id,game_name,purchase_notice_version", { count: "exact" })
      .eq("user_id", userId).eq("status", "purchased").eq("purchase_notice_unread", true).is("deleted_at", null)
      .order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(5);
    if (error) throwRepositoryError("讀取購入提醒失敗", error);
    return { data: (data ?? []) as PurchaseNotice[], total: count ?? 0 };
  },
};

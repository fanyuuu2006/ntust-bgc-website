import "server-only";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { buildPaginationResult, normalizePaginationOptions } from "@/repositories/shared/pagination";
import type { CreatePurchaseSuggestionInput, PurchaseSuggestionQuery } from "@/services/purchase-suggestions/purchase-suggestions.schema";
import type { AdminPurchaseSuggestionRecord } from "@/services/purchase-suggestions/purchase-suggestions.types";

const TABLE = "board_game_purchase_suggestions";
const OWN_FIELDS = "id,game_name,reason,reference_url,status,created_at";

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
  countForWeek: async (userId: string, start: string, end: string) => {
    const { count, error } = await supabase.from(TABLE).select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", start).lt("created_at", end);
    if (error) throwRepositoryError("讀取推薦額度失敗", error);
    return count ?? 0;
  },
  listAdmin: async (options: PurchaseSuggestionQuery) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({ ...options, maxPageSize: 50 });
    let query = supabase.from(TABLE).select(`${OWN_FIELDS},version,reviewed_at,reviewed_by_user_id`, { count: "exact" }).is("deleted_at", null);
    if (options.status !== "all") query = query.eq("status", options.status);
    if (options.search) query = query.ilike("game_name", `%${options.search.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error, count } = await query.order("created_at", { ascending: options.status === "pending" })
      .order("id", { ascending: options.status === "pending" }).range(from, to);
    if (error) throwRepositoryError("讀取管理端推薦失敗", error);
    return buildPaginationResult<AdminPurchaseSuggestionRecord>(data ?? [], count, page, pageSize);
  },
};

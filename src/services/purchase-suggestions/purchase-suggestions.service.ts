import "server-only";
import { z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { purchaseSuggestionsRepository as repository } from "@/repositories/purchase-suggestions.repository";
import { createPurchaseSuggestionSchema, managePurchaseSuggestionSchema, purchaseSuggestionQuerySchema } from "./purchase-suggestions.schema";
import { PurchaseSuggestionError } from "./purchase-suggestions.errors";
import { getPurchaseSuggestionWeek } from "@/utils/purchase-suggestions";

async function requireUser(admin = false) {
  const user = await getCurrentUser();
  if (!user || user.closed_at || !user.email_verified_at) throw new PurchaseSuggestionError("請先登入並完成信箱驗證", 403);
  if (admin && !await isAdminByUserId(user.id)) throw new PurchaseSuggestionError("沒有管理推薦的權限", 403);
  return user;
}

const resultSchema = z.object({ outcome: z.string(), id: z.uuid().optional(), replayed: z.boolean().optional(), retry_after: z.number().int().positive().optional() });
function result(raw: unknown) {
  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid purchase suggestion database response");
  const value = parsed.data;
  const errors: Record<string, [string, 403 | 404 | 409 | 429]> = {
    ineligible: ["請先登入並完成信箱驗證", 403], forbidden: ["沒有管理推薦的權限", 403],
    request_conflict: ["同一次提交的內容不一致，請重新整理後再試", 409],
    duplicate: ["這款桌遊仍在待評估，或你在最近 30 天內已推薦過", 409],
    cooldown: ["請至少間隔 60 秒再推薦下一款桌遊", 429],
    weekly_limit: ["本週已推薦三款，請於臺北時間下週一再試", 429],
    version_conflict: ["紀錄已被其他幹部處理，請重新整理後再操作", 409],
    not_found: ["找不到這筆紀錄，或紀錄已移除", 404], invalid_action: ["不支援的處理方式", 409],
  };
  const error = errors[value.outcome];
  if (error) throw new PurchaseSuggestionError(...error, value.retry_after);
  if (!["received", "updated"].includes(value.outcome)) throw new Error("Unexpected purchase suggestion result");
  return value;
}

export const purchaseSuggestionsService = {
  submit: async (input: unknown) => {
    const user = await requireUser();
    const receipt = result(await repository.submit(user.id, createPurchaseSuggestionSchema.parse(input)));
    if (!receipt.id || receipt.replayed === undefined) throw new Error("Missing purchase suggestion receipt");
    return { id: receipt.id, replayed: receipt.replayed };
  },
  quota: async () => {
    const user = await requireUser();
    const week = getPurchaseSuggestionWeek();
    const used = await repository.countForWeek(user.id, week.start, week.end);
    return { remaining: Math.max(0, 3 - used), resetsAt: week.end };
  },
  listAdmin: async (input: unknown = {}) => {
    await requireUser(true);
    return repository.listAdmin(purchaseSuggestionQuerySchema.parse(input));
  },
  manage: async (id: unknown, input: unknown) => {
    const user = await requireUser(true);
    const payload = managePurchaseSuggestionSchema.parse(input);
    result(await repository.manage(user.id, z.uuid().parse(id), payload.version, payload.action));
    return { updated: true };
  },
};

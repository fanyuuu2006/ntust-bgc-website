import { z } from "zod";

function boundedText(label: string, min: number, max: number) {
  return z.string().trim().superRefine((value, context) => {
    const length = Array.from(value).length;
    if (length < min) context.addIssue({ code: "custom", message: `${label}至少需要 ${min} 字，目前 ${length} 字，還差 ${min - length} 字。` });
    if (length > max) context.addIssue({ code: "custom", message: `${label}最多 ${max} 字，目前 ${length} 字，請減少 ${length - max} 字。` });
  }).refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value), "請移除不支援的控制字元");
}

export const referenceUrlSchema = z.string().trim().refine((value) => Array.from(value).length <= 500, "參考連結最多 500 字").refine((value) => {
  if (!value) return true;
  if (/[\s\u0000-\u001F\u007F\\]/u.test(value)) return false;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}, "請輸入不含帳密的完整 HTTP／HTTPS 網址").transform((value) => value || null);

export const createPurchaseSuggestionSchema = z.object({
  game_name: boundedText("桌遊名稱", 1, 50).refine((value) => !/[\t\r\n]/u.test(value), "桌遊名稱請使用單行文字"),
  reason: boundedText("推薦理由", 10, 200),
  // Keep historical links readable; the tighter limit applies to new submissions.
  reference_url: referenceUrlSchema.refine((value) => !value || Array.from(value).length <= 100, "參考連結最多 100 字").optional().transform((value) => value ?? null),
  request_id: z.uuid(),
}).strict();

export const managePurchaseSuggestionSchema = z.object({
  action: z.enum(["purchased", "rejected", "delete"]),
  version: z.number().int().positive().max(2147483647),
}).strict();

// Query strings are untrusted too. Bound offsets and fall back on invalid UI URLs.
export const purchaseSuggestionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(20),
  status: z.enum(["pending", "purchased", "rejected", "all"]).catch("pending"),
  search: z.string().trim().max(120).catch(""),
});

export type CreatePurchaseSuggestionInput = z.output<typeof createPurchaseSuggestionSchema>;
export type PurchaseSuggestionQuery = z.output<typeof purchaseSuggestionQuerySchema>;

import { z } from "zod";
import { plainTextFromRichContent, richDocumentSchema, type StoredRichContent } from "./content";

/**
 * 共用各 domain table 的明確描述欄位契約；不建立多型 CMS 資料表。
 */
export const descriptionFields = {
  description: z.string().nullish(),
  description_format: z.enum(["plain_text", "rich_text_v1"]).optional(),
  rich_description: richDocumentSchema.nullish(),
};
type DescriptionInput = z.infer<z.ZodObject<typeof descriptionFields>>;

/**
 * 檢查描述格式與文件是否配對；只更新其他欄位的 PATCH 不應清除既有 rich 文件。
 */
export function validateDescription(data: DescriptionInput, ctx: z.RefinementCtx) {
  if (data.description_format === "rich_text_v1") {
    if (!data.rich_description) ctx.addIssue({ code: "custom", path: ["rich_description"], message: "請提供完整的描述文件。" });
  } else {
    if (data.rich_description != null) ctx.addIssue({ code: "custom", path: ["description_format"], message: "請指定描述格式。" });
    if ((data.description?.trim().length ?? 0) > 2000) ctx.addIssue({ code: "custom", path: ["description"], message: "純文字描述不可超過 2000 字。" });
  }
}

/**
 * 只在 schema 驗證成功後由 Server 衍生搜尋文字，避免 Client 傳入互不相符的雙份內容。
 * 空白選填描述一起清除三個欄位；不含描述的 PATCH 完全不碰它們。
 */
export function canonicalizeDescription<T extends DescriptionInput>(data: T) {
  if (data.description_format === undefined && data.description === undefined && data.rich_description === undefined) return data;
  if (data.description_format === "rich_text_v1" && data.rich_description) {
    const text = plainTextFromRichContent(data.rich_description);
    if (text.replace(/[\s\u200b-\u200d\ufeff]/gu, "")) return { ...data, description: text, description_format: "rich_text_v1" as const, rich_description: data.rich_description };
  }
  return { ...data, description: data.description_format === "rich_text_v1" ? null : data.description?.trim() || null, description_format: "plain_text" as const, rich_description: null };
}

/**
 * 把 domain 描述欄名映射為 renderer 契約；不猜測 legacy 字串是否包含標記。
 */
export function storedDescription(value?: { description?: string | null; description_format?: string; rich_description?: unknown }): StoredRichContent {
  return { content: value?.description ?? "", content_format: value?.description_format, rich_content: value?.rich_description };
}

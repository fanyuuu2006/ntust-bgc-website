import { z } from "zod";
import { plainTextFromRichContent, richContentSchema, RICH_TEXT_MAX_LENGTH } from "@/libs/rich-content/content";

const common = { title: z.string().trim().min(1).max(160), is_published: z.boolean() };

/**
 * 驗證公告 mutation，並由 Server 從 rich 文件衍生純文字 companion。
 * 不能同時儲存 Client 提供、彼此無關的兩份內容；legacy 分支保留舊純文字 API 相容性。
 */
export const announcementInputSchema = z.union([
  z.object({
    ...common,
    content_format: z.literal("rich_text_v1"),
    rich_content: richContentSchema,
  }).transform((data) => ({ ...data, content: plainTextFromRichContent(data.rich_content) })),
  z.object({
    ...common,
    content_format: z.literal("plain_text").default("plain_text"),
    content: z.string().trim().min(1).max(RICH_TEXT_MAX_LENGTH),
    rich_content: z.null().optional(),
  }).transform((data) => ({ ...data, rich_content: null })),
]);

import { z } from "zod";
import { plainTextFromRichContent, richContentSchema, RICH_TEXT_MAX_LENGTH } from "@/libs/rich-content/content";

const common = { title: z.string().trim().min(1).max(160), is_published: z.boolean() };

/**
 * Validate mutation input and derive the plain-text companion on the server.
 * Never persist a client-supplied companion alongside an unrelated rich document.
 * The legacy branch keeps older plain-text API callers backward compatible.
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

import { z } from "zod";

export const REVIEW_CONTENT_MAX_LENGTH = 2000;

const rating = z.number().int().min(1).max(5);
function normalizeContent(value: string | null | undefined) {
  if (value == null) return null;
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized || null;
}
const contentValue = z.string().nullable().transform(normalizeContent).refine(
  (value) => value === null || Array.from(value).length <= REVIEW_CONTENT_MAX_LENGTH,
  `評論不可超過 ${REVIEW_CONTENT_MAX_LENGTH} 字`,
);

export const createReviewSchema = z.object({
  rating,
  content: contentValue.optional().transform(normalizeContent),
}).strict();
export const updateReviewSchema = z.object({
  rating: rating.optional(),
  content: contentValue.optional(),
}).strict().refine(
  (value) => "rating" in value || "content" in value,
  "請提供要更新的評論內容",
).transform((value) => ({
  ...value,
  ...("content" in value ? { content: normalizeContent(value.content) } : {}),
}));

export const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(10),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).catch("newest"),
});

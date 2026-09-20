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
/** 作者編輯會一次取代評分與文字，避免 PATCH 遺漏評分時沿用舊值。 */
export const replaceReviewSchema = createReviewSchema;
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
  search: z.string().trim().max(100).optional().catch(undefined).transform((value) => value || undefined),
  rating: z.union([
    z.enum(["1", "2", "3", "4", "5"]).transform((value) => Number(value) as 1 | 2 | 3 | 4 | 5),
    rating,
  ]).optional().catch(undefined),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).catch("newest"),
});

export const profileReviewsQuerySchema = listReviewsSchema.extend({ pageSize: z.literal(10).catch(10) });

export const adminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  search: z.string().trim().max(100).optional().catch(undefined).transform((value) => value || undefined),
  rating: z.union([
    z.enum(["1", "2", "3", "4", "5"]).transform((value) => Number(value) as 1 | 2 | 3 | 4 | 5),
    rating,
  ]).optional().catch(undefined),
  boardGameId: z.uuid().optional().catch(undefined),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).catch("newest"),
});

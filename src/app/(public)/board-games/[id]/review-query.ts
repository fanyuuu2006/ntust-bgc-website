import { readSingleQueryValue, type QueryParamValue } from "@/libs/query-params";
import { listReviewsSchema } from "@/services/reviews/reviews.schema";

export type BoardGameReviewSearchParams = Record<string, QueryParamValue>;

export function normalizeBoardGameReviewQuery(params: BoardGameReviewSearchParams) {
  return listReviewsSchema.parse({
    page: readSingleQueryValue(params.reviewPage),
    pageSize: 10,
    sort: readSingleQueryValue(params.reviewSort),
  });
}

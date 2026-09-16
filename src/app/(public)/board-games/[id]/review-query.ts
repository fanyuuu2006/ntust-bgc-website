import { readSingleQueryValue, type QueryParamValue } from "@/libs/query-params";
import { listReviewsSchema } from "@/services/reviews/reviews.schema";
import type { ReviewListQuery } from "@/services/reviews/reviews.types";

export type BoardGameReviewSearchParams = Record<string, QueryParamValue>;

export function normalizeBoardGameReviewQuery(params: BoardGameReviewSearchParams): ReviewListQuery {
  return listReviewsSchema.parse({
    page: readSingleQueryValue(params.reviewPage),
    pageSize: 10,
    search: readSingleQueryValue(params.reviewSearch),
    rating: readSingleQueryValue(params.reviewRating),
    sort: readSingleQueryValue(params.reviewSort),
  }) as ReviewListQuery;
}

import { readSingleQueryValue, type QueryParamValue } from "@/libs/query-params";
import { listReviewsSchema } from "@/services/reviews/reviews.schema";
import type { ReviewListQuery } from "@/services/reviews/reviews.types";
import { z } from "zod";

export type BoardGameReviewSearchParams = Record<string, QueryParamValue>;

export type BoardGameReviewQuery = ReviewListQuery & {
  targetReviewId?: string | null;
};

export function shouldCorrectReviewPermalink(
  params: BoardGameReviewSearchParams,
  location: { page: number },
) {
  return readSingleQueryValue(params.reviewPage) !== String(location.page)
    || readSingleQueryValue(params.reviewSort) !== "newest"
    || readSingleQueryValue(params.reviewSearch) !== undefined
    || readSingleQueryValue(params.reviewRating) !== undefined;
}

export function normalizeBoardGameReviewQuery(params: BoardGameReviewSearchParams): BoardGameReviewQuery {
  const requestedReviewId = readSingleQueryValue(params.review);
  const parsedReviewId = requestedReviewId === undefined
    ? undefined
    : z.uuid().safeParse(requestedReviewId);

  const query = listReviewsSchema.parse({
    page: readSingleQueryValue(params.reviewPage),
    pageSize: 10,
    search: readSingleQueryValue(params.reviewSearch),
    rating: readSingleQueryValue(params.reviewRating),
    sort: readSingleQueryValue(params.reviewSort),
  }) as ReviewListQuery;

  return {
    ...query,
    targetReviewId: parsedReviewId === undefined
      ? undefined
      : parsedReviewId.success
        ? parsedReviewId.data
        : null,
  };
}

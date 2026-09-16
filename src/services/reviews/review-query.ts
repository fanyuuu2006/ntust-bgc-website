import { readSingleQueryValue, type QueryParamValue } from "@/libs/query-params";
import { profileReviewsQuerySchema } from "./reviews.schema";
import type { ReviewListQuery } from "./reviews.types";

export type ReviewSearchParams = {
  reviewSearch?: QueryParamValue;
  reviewRating?: QueryParamValue;
  reviewSort?: QueryParamValue;
  reviewPage?: QueryParamValue;
};

export function normalizeProfileReviewsQuery(params: ReviewSearchParams): ReviewListQuery {
  const parsed = profileReviewsQuerySchema.parse({
    page: readSingleQueryValue(params.reviewPage),
    pageSize: 10,
    search: readSingleQueryValue(params.reviewSearch),
    rating: readSingleQueryValue(params.reviewRating),
    sort: readSingleQueryValue(params.reviewSort),
  });
  return { ...parsed, rating: parsed.rating as ReviewListQuery["rating"] };
}

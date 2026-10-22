import type { QueryParamValue } from "@/libs/query-params";

export type ReviewRankingSearchParams = Record<string, QueryParamValue>;

export const REVIEW_RANKING_SEARCH_MAX_LENGTH = 100;

export function normalizeReviewRankingQuery(params: ReviewRankingSearchParams) {
  const pageValue = Number(typeof params.page === "string" ? params.page : undefined);
  const rawSearch = typeof params.q === "string" ? params.q.trim() : "";

  return {
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    search: rawSearch && rawSearch.length <= REVIEW_RANKING_SEARCH_MAX_LENGTH
      ? rawSearch
      : undefined,
  };
}

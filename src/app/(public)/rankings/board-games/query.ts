import type { QueryParamValue } from "@/libs/query-params";
import { getBoardGameRanking } from "../ranking-config";

export type BoardGameRankingSearchParams = Record<string, QueryParamValue>;

export const BOARD_GAME_RANKING_SEARCH_MAX_LENGTH = 100;
export const BOARD_GAME_RANKING_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function normalizeSearch(value: QueryParamValue) {
  if (typeof value !== "string") return undefined;
  const search = value.trim();
  return search && search.length <= BOARD_GAME_RANKING_SEARCH_MAX_LENGTH
    ? search
    : undefined;
}

export function normalizeBoardGameRankingQuery(params: BoardGameRankingSearchParams) {
  const pageValue = Number(typeof params.page === "string" ? params.page : undefined);
  const pageSizeValue = Number(typeof params.pageSize === "string" ? params.pageSize : undefined);
  return {
    ranking: getBoardGameRanking(typeof params.ranking === "string" ? params.ranking : undefined),
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    pageSize: BOARD_GAME_RANKING_PAGE_SIZE_OPTIONS.includes(pageSizeValue as 10 | 20 | 50) ? pageSizeValue : 20,
    search: normalizeSearch(params.q),
  };
}

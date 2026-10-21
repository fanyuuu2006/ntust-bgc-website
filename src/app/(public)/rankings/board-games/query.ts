import type { QueryParamValue } from "@/libs/query-params";
import { getBoardGameRanking } from "../ranking-config";

export type BoardGameRankingSearchParams = Record<string, QueryParamValue>;

export const BOARD_GAME_RANKING_SEARCH_MAX_LENGTH = 100;

function normalizeSearch(value: QueryParamValue) {
  if (typeof value !== "string") return undefined;
  const search = value.trim();
  return search && search.length <= BOARD_GAME_RANKING_SEARCH_MAX_LENGTH
    ? search
    : undefined;
}

export function normalizeBoardGameRankingQuery(params: BoardGameRankingSearchParams) {
  const pageValue = Number(typeof params.page === "string" ? params.page : undefined);
  return {
    ranking: getBoardGameRanking(typeof params.ranking === "string" ? params.ranking : undefined),
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    search: normalizeSearch(params.q),
  };
}

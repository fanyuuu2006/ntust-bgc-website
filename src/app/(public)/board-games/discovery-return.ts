import { queryRecordFromSearchParams } from "@/libs/query-params";
import { buildQueryString } from "@/utils/url";
import { normalizePublicBoardGamesQuery } from "./query";

const DISCOVERY_PATH = "/board-games";
const DISCOVERY_QUERY_KEYS = new Set([
  "page",
  "pageSize",
  "search",
  "sort",
  "status",
  "category",
  "location",
]);

type DiscoveryState = ReturnType<typeof normalizePublicBoardGamesQuery>;

export function buildBoardGameDiscoveryPath(state: DiscoveryState): string {
  const query = buildQueryString({
    page: state.page,
    pageSize: state.pageSize,
    search: state.search,
    sort: state.sortOption.key,
    status: state.statuses,
    category: state.categoryIds,
    location: state.locationIds,
  });
  return query ? `${DISCOVERY_PATH}?${query}` : DISCOVERY_PATH;
}

export function normalizeBoardGameDiscoveryReturnTo(value: unknown): string {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) {
    return DISCOVERY_PATH;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      url.pathname !== DISCOVERY_PATH ||
      url.hash ||
      [...url.searchParams.keys()].some((key) => !DISCOVERY_QUERY_KEYS.has(key))
    ) {
      return DISCOVERY_PATH;
    }
    return buildBoardGameDiscoveryPath(
      normalizePublicBoardGamesQuery(queryRecordFromSearchParams(url.searchParams)),
    );
  } catch {
    return DISCOVERY_PATH;
  }
}

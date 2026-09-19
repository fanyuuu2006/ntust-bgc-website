const FALLBACK_PATH = "/board-games";
const LOCAL_ORIGIN = "https://return.local";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BOARD_GAME_STATUSES = new Set([
  "available", "borrowed", "maintenance", "lost", "damaged", "retired",
]);
const BOARD_GAME_SORTS = new Set([
  "popular", "rating:desc", "created_at:desc", "created_at:asc", "name:asc",
  "name:desc", "inventory_number:asc", "inventory_number:desc", "updated_at:desc",
]);
const BORROWING_STATUSES = new Set([
  "pending", "approved", "borrowed", "returned", "rejected", "cancelled",
]);
const BORROWING_SORTS = new Set([
  "created_at:desc", "created_at:asc", "due_at:asc", "returned_at:desc",
]);
const REVIEW_SORTS = new Set(["newest", "oldest", "highest", "lowest"]);

function isPositiveInteger(value: string | null, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return value !== null && Number.isInteger(parsed) && parsed > 0 && parsed <= max;
}

function hasOnlyKeys(params: URLSearchParams, allowed: ReadonlySet<string>) {
  return [...params.keys()].every((key) => allowed.has(key));
}

function appendIf(params: URLSearchParams, key: string, value: string | null, valid = true) {
  if (value && valid) params.append(key, value.trim());
}

function canonicalPath(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeDiscovery(url: URL) {
  const allowed = new Set(["page", "pageSize", "search", "sort", "status", "category", "location"]);
  if (!hasOnlyKeys(url.searchParams, allowed)) return null;
  const result = new URLSearchParams();
  appendIf(result, "page", url.searchParams.get("page"), isPositiveInteger(url.searchParams.get("page")));
  appendIf(result, "pageSize", url.searchParams.get("pageSize"), ["24", "36", "48", "60"].includes(url.searchParams.get("pageSize") ?? ""));
  appendIf(result, "search", url.searchParams.get("search"));
  appendIf(result, "sort", url.searchParams.get("sort"), BOARD_GAME_SORTS.has(url.searchParams.get("sort") ?? ""));
  for (const status of url.searchParams.getAll("status")) appendIf(result, "status", status, BOARD_GAME_STATUSES.has(status));
  for (const category of url.searchParams.getAll("category")) appendIf(result, "category", category, UUID_PATTERN.test(category));
  for (const location of url.searchParams.getAll("location")) appendIf(result, "location", location, UUID_PATTERN.test(location));
  return canonicalPath(FALLBACK_PATH, result);
}

function normalizeBorrowings(url: URL) {
  const allowed = new Set(["page", "pageSize", "search", "status", "sort"]);
  if (!hasOnlyKeys(url.searchParams, allowed)) return null;
  const result = new URLSearchParams();
  appendIf(result, "page", url.searchParams.get("page"), isPositiveInteger(url.searchParams.get("page")));
  appendIf(result, "pageSize", url.searchParams.get("pageSize"), ["10", "20", "50"].includes(url.searchParams.get("pageSize") ?? ""));
  appendIf(result, "search", url.searchParams.get("search"));
  appendIf(result, "status", url.searchParams.get("status"), BORROWING_STATUSES.has(url.searchParams.get("status") ?? ""));
  appendIf(result, "sort", url.searchParams.get("sort"), BORROWING_SORTS.has(url.searchParams.get("sort") ?? ""));
  return canonicalPath("/borrowings", result);
}

function normalizeProfile(url: URL) {
  const allowed = new Set(["reviewPage", "reviewSearch", "reviewRating", "reviewSort"]);
  if (!hasOnlyKeys(url.searchParams, allowed)) return null;
  const result = new URLSearchParams();
  appendIf(result, "reviewPage", url.searchParams.get("reviewPage"), isPositiveInteger(url.searchParams.get("reviewPage")));
  appendIf(result, "reviewSearch", url.searchParams.get("reviewSearch"));
  appendIf(result, "reviewRating", url.searchParams.get("reviewRating"), ["1", "2", "3", "4", "5"].includes(url.searchParams.get("reviewRating") ?? ""));
  appendIf(result, "reviewSort", url.searchParams.get("reviewSort"), REVIEW_SORTS.has(url.searchParams.get("reviewSort") ?? ""));
  return canonicalPath(url.pathname, result);
}

function normalizeAdminBorrowings(url: URL) {
  const allowed = new Set(["overdue", "page", "pageSize", "status", "board_game_id", "user_id", "search", "orderBy", "orderDirection"]);
  if (!hasOnlyKeys(url.searchParams, allowed)) return null;
  const result = new URLSearchParams();
  appendIf(result, "overdue", url.searchParams.get("overdue"), url.searchParams.get("overdue") === "true");
  appendIf(result, "page", url.searchParams.get("page"), isPositiveInteger(url.searchParams.get("page")));
  appendIf(result, "pageSize", url.searchParams.get("pageSize"), isPositiveInteger(url.searchParams.get("pageSize"), 100));
  appendIf(result, "status", url.searchParams.get("status"), BORROWING_STATUSES.has(url.searchParams.get("status") ?? ""));
  appendIf(result, "board_game_id", url.searchParams.get("board_game_id"), UUID_PATTERN.test(url.searchParams.get("board_game_id") ?? ""));
  appendIf(result, "user_id", url.searchParams.get("user_id"), UUID_PATTERN.test(url.searchParams.get("user_id") ?? ""));
  appendIf(result, "search", url.searchParams.get("search"));
  appendIf(result, "orderBy", url.searchParams.get("orderBy"), ["created_at", "borrowed_at", "due_at", "returned_at"].includes(url.searchParams.get("orderBy") ?? ""));
  appendIf(result, "orderDirection", url.searchParams.get("orderDirection"), ["asc", "desc"].includes(url.searchParams.get("orderDirection") ?? ""));
  return canonicalPath("/admin/board-games/borrowings", result);
}

export function normalizeBoardGameReturnTo(value: unknown): string {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) return FALLBACK_PATH;
  try {
    const url = new URL(value, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN || url.username || url.password || url.hash) return FALLBACK_PATH;
    if ((url.pathname === "/" || url.pathname === "/dashboard") && !url.search) return url.pathname;
    if (url.pathname === FALLBACK_PATH) return normalizeDiscovery(url) ?? FALLBACK_PATH;
    if (url.pathname === "/borrowings") return normalizeBorrowings(url) ?? FALLBACK_PATH;
    if (url.pathname === "/profile" || /^\/profile\/[0-9a-f-]+$/i.test(url.pathname)) {
      if (url.pathname !== "/profile" && !UUID_PATTERN.test(url.pathname.slice(9))) return FALLBACK_PATH;
      return normalizeProfile(url) ?? FALLBACK_PATH;
    }
    if (url.pathname === "/admin/board-games/borrowings") return normalizeAdminBorrowings(url) ?? FALLBACK_PATH;
  } catch {
    return FALLBACK_PATH;
  }
  return FALLBACK_PATH;
}

export function buildBoardGameDetailHref(boardGameId: string, returnTo: string) {
  return `/board-games/${boardGameId}?${new URLSearchParams({ returnTo: normalizeBoardGameReturnTo(returnTo) })}`;
}

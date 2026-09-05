import { boardGamesService } from "@/services/board-games/board-games.service";
import { Pagination } from "@/components/Pagination/Pagination";
import { BoardGameSearchForm } from "@/components/(public)/board-games/BoardGameSearchForm";
import { BoardGameGrid } from "@/components/(public)/board-games/BoardGameGrid";
import type { BoardGameStatus } from "@/types/database";
import {
  ALLOWED_STATUSES,
  BASE_PATH,
  normalizePageSize,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from "./constants";
import type { BoardGamesQuery } from "./types";

type BoardGamesSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string | string[];
  category?: string | string[];
  location?: string | string[];
  sort?: string;
  orderBy?: string;
  orderDirection?: string;
};

type BoardGamesPageProps = {
  searchParams: Promise<BoardGamesSearchParams>;
};

function getArrayParam(value?: string | string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeSearch(value?: string) {
  return value?.trim() || undefined;
}

function normalizeStatuses(value?: string | string[]) {
  return getArrayParam(value).filter((status): status is BoardGameStatus =>
    ALLOWED_STATUSES.includes(status as BoardGameStatus),
  );
}

function normalizeSortOption(
  sort?: string,
  orderBy?: string,
  orderDirection?: string,
) {
  return (
    SORT_OPTIONS.find(
      (option) =>
        option.key === sort ||
        (option.orderBy === orderBy && option.orderDirection === orderDirection),
    ) ?? SORT_OPTIONS[0]
  );
}

export default async function BoardGamesPage({
  searchParams,
}: BoardGamesPageProps) {
  const params = await searchParams;

  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);
  const search = normalizeSearch(params.search);
  const statuses = normalizeStatuses(params.status);
  const categoryIds = getArrayParam(params.category);
  const locationIds = getArrayParam(params.location);
  const sortOption = normalizeSortOption(
    params.sort,
    params.orderBy,
    params.orderDirection,
  );

  const query: BoardGamesQuery = {
    search,
    status: statuses.length > 0 ? statuses : undefined,
    category: categoryIds.length > 0 ? categoryIds : undefined,
    location: locationIds.length > 0 ? locationIds : undefined,
    orderBy: sortOption.orderBy,
    orderDirection: sortOption.orderDirection,
  };
  const hasActiveQuery =
    Boolean(search) ||
    statuses.length > 0 ||
    categoryIds.length > 0 ||
    locationIds.length > 0 ||
    page > 1;

  const [categories, locations, boardGames] = await Promise.all([
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
    boardGamesService.listBoardGamesWithCategoryAndLocation({
      page,
      pageSize,
      search,
      status: query.status,
      category_ids: query.category,
      location_ids: query.location,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
    }),
  ]);

  return (
    <section>
      <div className="container space-y-5 sm:space-y-6">
        <header className="space-y-2">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-(--text-primary) sm:text-3xl">
              桌遊
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-(--text-muted) sm:text-base">
              探索社團桌遊，找到下一款想玩的遊戲。
            </p>
          </div>
        </header>

        <BoardGameSearchForm
          categories={categories}
          locations={locations}
          query={query}
          pageSize={pageSize}
          total={boardGames.total}
        />

        <BoardGameGrid
          boardGames={boardGames.data}
          hasActiveQuery={hasActiveQuery}
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={boardGames.total}
          totalPages={boardGames.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={{
            search,
            status: query.status,
            category: query.category,
            location: query.location,
            sort: sortOption.key,
          }}
        />
      </div>
    </section>
  );
}

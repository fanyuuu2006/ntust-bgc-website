import { boardGamesService } from "@/services/board-games/board-games.service";
import { Pagination } from "@/components/Pagination/Pagination";
import { BoardGameSearchForm } from "@/components/(public)/board-games/BoardGameSearchForm";
import { BoardGameGrid } from "@/components/(public)/board-games/BoardGameGrid";
import type { BoardGameStatus } from "@/types/database";
import {
  ALLOWED_STATUSES,
  BASE_PATH,
  DEFAULT_ORDER_BY,
  DEFAULT_ORDER_DIRECTION,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ORDER_BY_OPTIONS,
  PAGE_SIZE_OPTIONS,
} from "./constants";
import type { BoardGamesQuery } from "./types";

type BoardGamesSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string | string[];
  category?: string | string[];
  location?: string | string[];
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

function normalizePageSize(value?: string) {
  const pageSize = Number(value);
  if (!Number.isInteger(pageSize) || pageSize <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function normalizeSearch(value?: string) {
  return value?.trim() || undefined;
}

function normalizeStatuses(value?: string | string[]) {
  return getArrayParam(value).filter((status): status is BoardGameStatus =>
    ALLOWED_STATUSES.includes(status as BoardGameStatus),
  );
}

function normalizeOrderBy(value?: string): BoardGamesQuery["orderBy"] {
  const match = ORDER_BY_OPTIONS.find((option) => option.value === value);
  return match?.value ?? DEFAULT_ORDER_BY;
}

function normalizeOrderDirection(value?: string): "asc" | "desc" {
  return value === "asc" || value === "desc" ? value : DEFAULT_ORDER_DIRECTION;
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
  const orderBy = normalizeOrderBy(params.orderBy);
  const orderDirection = normalizeOrderDirection(params.orderDirection);

  const query: BoardGamesQuery = {
    search,
    status: statuses.length > 0 ? statuses : undefined,
    category: categoryIds.length > 0 ? categoryIds : undefined,
    location: locationIds.length > 0 ? locationIds : undefined,
    orderBy,
    orderDirection,
  };

  const [categories, locations, boardGames, ] =
    await Promise.all([
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
      // boardGamesService.countAllBoardGames(),
      // boardGamesService.countBoardGamesByStatus("available"),
    ]);

  return (
    <section className="py-8">
      <div className="container space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">
            桌遊館藏
          </h1>
          <p className="text-sm text-(--muted) sm:text-base">
            探索社團目前收藏的桌遊，找到適合你的下一款遊戲。
          </p>
        </header>

        <BoardGameSearchForm
          categories={categories}
          locations={locations}
          query={query}
          pageSize={pageSize}
        />
        {/* 
        <div className="flex flex-wrap items-center gap-3">
          <QuickStats
            stats={[
              {
                key: "total",
                label: "館藏總數",
                value: boardGamesCount,
                accent: "primary",
              },
              {
                key: "available",
                label: "目前可借用",
                value: availableCount,
                accent: "green",
              },
            ]}
          />
        </div> */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-(--muted)">
            共{" "}
            <span className="font-medium text-(--foreground)">
              {boardGames.total}
            </span>{" "}
            款桌遊符合條件
          </p>
        </div>

        <BoardGameGrid boardGames={boardGames.data} />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={boardGames.total}
          totalPages={boardGames.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={query}
        />
      </div>
    </section>
  );
}

import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { BoardGameTable } from "@/components/(admin)/admin/board-games/BoardGameTable";
import { SearchForm } from "@/components/(admin)/admin/board-games/SearchForm";
import { FindManyBoardGamesOptions } from "@/repositories/board-games.repository";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BoardGameStatus } from "@/types/database";
import {
  DEFAULT_ORDER_BY,
  DEFAULT_ORDER_DIRECTION,
  DEFAULT_PAGE_SIZE,
} from "./constants";

type BoardGamesSearchParams = {
  page?: string;
  pageSize?: string;
  orderBy?: FindManyBoardGamesOptions["orderBy"];
  orderDirection?: "asc" | "desc";
  search?: string;
  status?: string | string[];
  category?: string | string[];
  location?: string | string[];
};

type BoardGamesAdminPageProps = {
  searchParams: Promise<BoardGamesSearchParams>;
};

export default async function BoardGamesAdminPage({
  searchParams,
}: BoardGamesAdminPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Number(params.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE,
    ),
  );
  const orderBy = params.orderBy ?? DEFAULT_ORDER_BY;
  const orderDirection = params.orderDirection
    ? params.orderDirection.toLowerCase() === "asc"
      ? "asc"
      : "desc"
    : DEFAULT_ORDER_DIRECTION;
  const statuses = (
    Array.isArray(params.status)
      ? params.status
      : params.status
        ? [params.status]
        : []
  ) as BoardGameStatus[];
  const category_ids = Array.isArray(params.category)
    ? params.category
    : params.category
      ? [params.category]
      : [];

  const location_ids = Array.isArray(params.location)
    ? params.location
    : params.location
      ? [params.location]
      : [];

  const [boardGames, category, location] = await Promise.all([
    boardGamesService.listBoardGamesWithCategoryAndLocation({
      page,
      pageSize,
      orderBy,
      orderDirection,
      search: params.search,
      status: statuses.length > 0 ? statuses : undefined,
      category_ids: category_ids,
      location_ids: location_ids,
    }),
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
  ]);

  const query = {
    search: params.search,
    status: statuses.length > 0 ? statuses : undefined,
    category: category_ids.length > 0 ? category_ids : undefined,
    location: location_ids.length > 0 ? location_ids : undefined,
    orderBy,
    orderDirection,
    page,
  } as const;

  return (
    <>
      <HeadingSection title="桌遊管理" />
      <section className="px-4 space-y-4">
        <SearchForm
          className="sticky top-4 z-5"
          categories={category}
          locations={location}
          query={query}
        />
        <BoardGameTable boardGames={boardGames.data} query={query} />
      </section>
    </>
  );
}

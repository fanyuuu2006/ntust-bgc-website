import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { BoardGameTable } from "@/components/(admin)/admin/board-games/BoardGameTable";
import { BoardGameSearchForm } from "@/components/(admin)/admin/board-games/BoardGameSearchForm";
import type { FindManyBoardGamesOptions } from "@/repositories/board-games.repository";
import { listAdminBoardGamesQuerySchema } from "@/services/board-games/board-games.schema";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BoardGameStatus } from "@/types/database";
import { buildQueryString } from "@/utils/url";
import {
  BASE_PATH,
  DEFAULT_ORDER_BY,
  DEFAULT_ORDER_DIRECTION,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from "./constants";
import { ButtonLink } from "@/components/ui/Button";
import { Pagination } from "@/components/Pagination/Pagination";
import { Plus } from "lucide-react";

type BoardGamesSearchParams = {
  page?: string;
  pageSize?: string;
  orderBy?: FindManyBoardGamesOptions["orderBy"];
  orderDirection?: "asc" | "desc";
  search?: string;
  status?: string;
  category?: string;
  location?: string;
};

type BoardGamesAdminPageProps = {
  searchParams: Promise<BoardGamesSearchParams>;
};

export default async function BoardGamesAdminPage({
  searchParams,
}: BoardGamesAdminPageProps) {
  const parsed = listAdminBoardGamesQuerySchema.safeParse(await searchParams);
  const params = parsed.success ? parsed.data : {};

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
  const [
    boardGames,
    category,
    location,
  ] = await Promise.all([
    boardGamesService.listAdminBoardGamesWithCategoryAndLocation({
      page,
      pageSize,
      orderBy,
      orderDirection,
      search: params.search,
      status: params.status as BoardGameStatus | undefined,
      categoryId: params.category,
      locationId: params.location,
    }),
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
  ]);

  const query = {
    search: params.search,
    status: params.status as BoardGameStatus | undefined,
    category: params.category,
    location: params.location,
    orderBy,
    orderDirection,
    page,
    pageSize,
  } as const;
  const clearSearchQuery = buildQueryString({
    status: query.status,
    category: query.category,
    location: query.location,
    orderBy: query.orderBy,
    orderDirection: query.orderDirection,
    pageSize: query.pageSize,
  });
  const clearSearchHref = clearSearchQuery
    ? `${BASE_PATH}?${clearSearchQuery}`
    : BASE_PATH;

  return (
    <>
      <HeadingSection
        title="桌遊管理"
        description="管理社團桌遊、社產編號與基本資訊。"
        actions={
          <ButtonLink href="/admin/board-games/new">
            <Plus aria-hidden="true" className="size-4" />
            新增桌遊
          </ButtonLink>
        }
      />

      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <BoardGameSearchForm
          categories={category}
          locations={location}
          query={query}
          clearSearchHref={clearSearchHref}
        />

        <BoardGameTable
          boardGames={boardGames.data}
          query={query}
          hasFilters={Boolean(query.search || query.status || query.category || query.location)}
        />

        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={boardGames.total}
          totalPages={boardGames.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={query}
        />
      </section>
    </>
  );
}

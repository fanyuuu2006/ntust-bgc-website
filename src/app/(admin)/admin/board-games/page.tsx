import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { BoardGameTable } from "@/components/(admin)/admin/board-games/BoardGameTable";
import { SearchForm } from "@/components/(admin)/admin/board-games/SearchForm";
import { FindManyBoardGamesOptions } from "@/repositories/board-games.repository";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BoardGameStatus } from "@/types/database";

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
    Math.min(100, Number(params.pageSize ?? 20) || 20),
  );
  const orderBy = params.orderBy ?? "inventory_number";
  const orderDirection = params.orderDirection
    ? params.orderDirection.toLowerCase() === "asc"
      ? "asc"
      : "desc"
    : "asc";
  const statuses = (
    Array.isArray(params.status)
      ? params.status
      : params.status
        ? [params.status]
        : []
  ) as BoardGameStatus[];
  const categorie_ids = Array.isArray(params.category)
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
      category_ids: categorie_ids,
      location_ids: location_ids,
    }),
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
  ]);

  return (
    <>
      <HeadingSection title="桌遊管理" />
      <section className="px-4 space-y-4">
        <SearchForm
          categories={category}
          locations={location}
          query={{
            search: params.search,
            status: statuses.length > 0 ? statuses : undefined,
            category: categorie_ids.length > 0 ? categorie_ids : undefined,
            location: location_ids.length > 0 ? location_ids : undefined,
          }}
        />
        <BoardGameTable boardGames={boardGames.data} />
      </section>
    </>
  );
}

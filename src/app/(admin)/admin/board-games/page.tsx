import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { SearchForm } from "@/components/(admin)/admin/board-games/SearchForm";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BoardGameStatus } from "@/types/database";

type BoardGamesSearchParams = {
  page?: string;
  pageSize?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  search?: string;
  status?: string | string[];
  category?: string | string[];
  location?: string | string[];
};

type BoardGamesAdminPageProps = {
  searchParams: Promise<BoardGamesSearchParams>;
};

const PAGE_SIZE = 50;

export default async function BoardGamesAdminPage({
  searchParams,
}: BoardGamesAdminPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? 1) || 1);
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
      pageSize: PAGE_SIZE,
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
      <section className="px-4">
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
      </section>
    </>
  );
}

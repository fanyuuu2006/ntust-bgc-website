import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { SearchFormSection } from "@/components/(admin)/admin/board-games/SearchFormSection";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BoardGameStatus } from "@/types/database";

type BoardGamesSearchParams = {
  page?: string;
  search?: string;
  status?: string | string[];
  category?: string;
  location?: string;
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

  const [boardGames, categories, locations] = await Promise.all([
    boardGamesService.listBoardGamesWithCategoryAndLocation({
      page,
      pageSize: PAGE_SIZE,
      search: params.search,
      status: statuses.length > 0 ? statuses : undefined,
      category_id: params.category || undefined,
      location_id: params.location || undefined,
    }),
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
  ]);

  return (
    <>
      <HeadingSection
        title="桌遊管理"
        description="在這裡可以管理桌遊的資料，包含新增、編輯、刪除桌遊，以及搜尋與篩選桌遊。"
      />

      <SearchFormSection
        categories={categories}
        locations={locations}
        defaultSearch={params.search}
        defaultStatuses={statuses}
        defaultCategoryId={params.category}
        defaultLocationId={params.location}
      />
    </>
  );
}

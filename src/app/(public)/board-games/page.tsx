import { boardGamesService } from "@/services/board-games/board-games.service";
import { Pagination } from "@/components/Pagination/Pagination";
import { BoardGameSearchForm } from "@/components/(public)/board-games/BoardGameSearchForm";
import { BoardGameGrid } from "@/components/(public)/board-games/BoardGameGrid";
import { PageHeader } from "@/components/PageHeader";
import { classifyQuerySeo } from "@/libs/query-seo";
import type { Metadata } from "next";
import {
  BASE_PATH,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from "./constants";
import type { BoardGamesQuery } from "./types";
import {
  normalizePublicBoardGamesQuery,
  type PublicBoardGamesSearchParams,
} from "./query";

const BOARD_GAMES_METADATA = {
  title: "桌遊",
  description: "探索臺科大桌遊社的桌遊，查看分類、位置與借用資訊。",
  alternates: {
    canonical: "/board-games",
  },
} satisfies Metadata;

type BoardGamesPageProps = {
  searchParams: Promise<PublicBoardGamesSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: BoardGamesPageProps): Promise<Metadata> {
  const params = await searchParams;
  const { indexable } = classifyQuerySeo(params, {
    page: "1",
    pageSize: String(PAGE_SIZE_OPTIONS[0]),
    sort: SORT_OPTIONS[0].key,
  });

  return {
    ...BOARD_GAMES_METADATA,
    ...(indexable
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

export default async function BoardGamesPage({
  searchParams,
}: BoardGamesPageProps) {
  const params = await searchParams;
  const {
    page,
    pageSize,
    search,
    statuses,
    categoryIds,
    locationIds,
    sortOption,
  } = normalizePublicBoardGamesQuery(params);

  const query: BoardGamesQuery = {
    search,
    status: statuses.length > 0 ? statuses : undefined,
    category: categoryIds.length > 0 ? categoryIds : undefined,
    location: locationIds.length > 0 ? locationIds : undefined,
    sort: sortOption.key,
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
    boardGamesService.listBoardGameDiscovery({
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
      <div className="container py-8">
        <PageHeader
          eyebrow="桌遊探索"
          title="桌遊"
          description="探索社團桌遊，找到下一款想玩的遊戲。"
        />

        <div className="mt-6">
          <BoardGameSearchForm
            categories={categories}
            locations={locations}
            query={query}
            pageSize={pageSize}
            total={boardGames.total}
          />
        </div>

        <div className="mt-6">
          <BoardGameGrid
            boardGames={boardGames.data}
            hasActiveQuery={hasActiveQuery}
          />
        </div>

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
            sort: query.sort,
          }}
          className="mt-6"
        />
      </div>
    </section>
  );
}

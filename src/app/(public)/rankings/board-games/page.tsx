import type { Metadata } from "next";

import { BoardGameRankingList } from "@/components/(public)/rankings/BoardGameRankingList";
import { BoardGameRankingSearchForm } from "@/components/(public)/rankings/BoardGameRankingSearchForm";
import { RankingNavigation } from "@/components/(public)/rankings/RankingNavigation";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { PageHeader } from "@/components/PageHeader";
import { createPublicMetadata } from "@/libs/seo";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { BOARD_GAME_RANKING_PAGE_SIZE } from "../ranking-config";
import { normalizeBoardGameRankingQuery, type BoardGameRankingSearchParams } from "./query";

type RankingsPageProps = { searchParams: Promise<BoardGameRankingSearchParams> };

const BASE_METADATA = createPublicMetadata({
  title: "桌遊排行榜",
  description: "查看桌遊綜合、評分、評論與累計借用排行。",
  canonical: "/rankings/board-games",
});

async function generateMetadataContent({ searchParams }: RankingsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasVariant = Object.keys(params).some((key) => key !== "ranking" || params.ranking !== "popular");
  return { ...BASE_METADATA, ...(hasVariant ? { robots: { index: false, follow: true } } : {}) };
}

async function BoardGameRankingsPage({ searchParams }: RankingsPageProps) {
  const { ranking, page, search } = normalizeBoardGameRankingQuery(await searchParams);
  const result = await boardGamesService.listBoardGameRankings(ranking.key, {
    page,
    pageSize: BOARD_GAME_RANKING_PAGE_SIZE,
    search,
  });

  return (
    <section className="container py-8">
      <PageHeader eyebrow="排行榜" title="桌遊排行榜" description={ranking.description} />
      <div className="mt-6"><RankingNavigation active={ranking.key} search={search} /></div>
      <BoardGameRankingSearchForm
        ranking={ranking.key}
        search={search}
        total={result.total}
      />
      <PaginatedCollection
        className="mt-5"
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        basePath="/rankings/board-games"
        query={{
          ranking: ranking.key === "popular" ? undefined : ranking.key,
          q: search,
        }}
        showPageSize={false}
        itemLabel="款桌遊"
      >
        <div className="rounded-2xl border border-(--border-default) bg-(--surface-default) px-3 sm:px-5">
          <BoardGameRankingList
            items={result.data}
            ranking={ranking.key}
            emptyDescription={search ? "找不到符合搜尋條件的桌遊，請調整關鍵字或清除搜尋。" : undefined}
          />
        </div>
      </PaginatedCollection>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/rankings/board-games");
export default withServerErrorReference(BoardGameRankingsPage, "/rankings/board-games");

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BoardGameRankingList } from "@/components/(public)/rankings/BoardGameRankingList";
import { ReviewRankingList } from "@/components/(public)/rankings/ReviewRankingList";
import { RankingNavigation } from "@/components/(public)/rankings/RankingNavigation";
import { PageHeader } from "@/components/PageHeader";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { createPublicMetadata } from "@/libs/seo";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { reviewsService } from "@/services/reviews/reviews.service";
import { getBoardGameRanking } from "./ranking-config";

type RankingsPageProps = { searchParams: Promise<{ ranking?: string | string[] }> };

const BASE_METADATA = createPublicMetadata({
  title: "排行榜",
  description: "探索社團最受歡迎、評價最高、評論最多與最常借用的桌遊。",
  canonical: "/rankings",
});

async function generateMetadataContent({ searchParams }: RankingsPageProps): Promise<Metadata> {
  const ranking = (await searchParams).ranking;
  return { ...BASE_METADATA, ...(ranking === undefined || ranking === "popular" ? {} : { robots: { index: false, follow: true } }) };
}

async function RankingsPage({ searchParams }: RankingsPageProps) {
  const rawRanking = (await searchParams).ranking;
  const ranking = getBoardGameRanking(typeof rawRanking === "string" ? rawRanking : undefined);
  const [result, reviewResult] = await Promise.all([
    boardGamesService.listBoardGameRankings(ranking.key, { page: 1, pageSize: 3 }),
    reviewsService.listPopularRankings({ page: 1, pageSize: 3 }),
  ]);

  return (
    <section className="container py-8">
      <PageHeader title="排行榜" description="探索社團中值得關注的內容與排行。" />

      <section className="mt-6" aria-labelledby="board-game-ranking-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="board-game-ranking-heading" className="text-lg font-bold text-(--text-primary)">桌遊排行</h2>
          <Link href={ranking.key === "popular" ? "/rankings/board-games" : `/rankings/board-games?ranking=${ranking.key}`} className="inline-flex min-h-11 shrink-0 items-center gap-1 px-1 text-sm font-medium text-(--interactive-primary) hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
            完整排行 <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <p className="mt-1 text-sm text-(--text-muted)">{ranking.description}</p>
        <div className="mt-4"><RankingNavigation active={ranking.key} basePath="/rankings" /></div>
        <div className="mt-4 rounded-2xl border border-(--border-default) bg-(--surface-default) px-3 sm:px-5">
          <BoardGameRankingList items={result.data} ranking={ranking.key} compact />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="review-ranking-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="review-ranking-heading" className="text-lg font-bold text-(--text-primary)">最受歡迎評論</h2>
          <Link href="/rankings/reviews" className="inline-flex min-h-11 shrink-0 items-center gap-1 px-1 text-sm font-medium text-(--interactive-primary) hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
            完整排行 <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <p className="mt-1 text-sm text-(--text-muted)">依公開評論獲得的按讚數排名。</p>
        <div className="mt-4 rounded-2xl border border-(--border-default) bg-(--surface-default) px-3 sm:px-5">
          <ReviewRankingList items={reviewResult.data} />
        </div>
      </section>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/rankings");
export default withServerErrorReference(RankingsPage, "/rankings");

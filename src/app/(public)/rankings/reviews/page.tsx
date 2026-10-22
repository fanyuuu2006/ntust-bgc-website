import type { Metadata } from "next";

import { ReviewRankingList } from "@/components/(public)/rankings/ReviewRankingList";
import { ReviewRankingSearchForm } from "@/components/(public)/rankings/ReviewRankingSearchForm";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { PageHeader } from "@/components/PageHeader";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { createPublicMetadata } from "@/libs/seo";
import { reviewsService } from "@/services/reviews/reviews.service";
import { normalizeReviewRankingQuery, type ReviewRankingSearchParams } from "./query";

type ReviewsRankingsPageProps = { searchParams: Promise<ReviewRankingSearchParams> };

const PAGE_SIZE = 20;
const BASE_METADATA = createPublicMetadata({
  title: "熱門評論",
  description: "看看哪些桌遊心得最受歡迎！",
  canonical: "/rankings/reviews",
});

async function generateMetadataContent({ searchParams }: ReviewsRankingsPageProps): Promise<Metadata> {
  const { page, search } = normalizeReviewRankingQuery(await searchParams);
  return { ...BASE_METADATA, ...(page > 1 || search ? { robots: { index: false, follow: true } } : {}) };
}

async function ReviewRankingsPage({ searchParams }: ReviewsRankingsPageProps) {
  const { page, search } = normalizeReviewRankingQuery(await searchParams);
  const result = await reviewsService.listPopularRankings({ page, pageSize: PAGE_SIZE, search });

  return (
    <section className="container py-8">
      <PageHeader eyebrow="排行榜" title="熱門評論" description="看看哪些桌遊心得最受歡迎！" />
      <ReviewRankingSearchForm search={search} total={result.total} />
      <PaginatedCollection
        className="mt-5"
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        basePath="/rankings/reviews"
        query={{ q: search }}
        showPageSize={false}
        itemLabel="則評論"
      >
        <div className="rounded-2xl border border-(--border-default) bg-(--surface-default) px-3 sm:px-5">
          <ReviewRankingList
            items={result.data}
            emptyDescription={search ? "找不到符合搜尋條件的評論，請調整關鍵字或清除搜尋。" : undefined}
          />
        </div>
      </PaginatedCollection>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/rankings/reviews");
export default withServerErrorReference(ReviewRankingsPage, "/rankings/reviews");

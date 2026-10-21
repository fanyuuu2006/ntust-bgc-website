import type { Metadata } from "next";

import { ReviewRankingList } from "@/components/(public)/rankings/ReviewRankingList";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { PageHeader } from "@/components/PageHeader";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { createPublicMetadata } from "@/libs/seo";
import { reviewsService } from "@/services/reviews/reviews.service";

type ReviewsRankingsPageProps = { searchParams: Promise<{ page?: string | string[] }> };

const PAGE_SIZE = 20;
const BASE_METADATA = createPublicMetadata({
  title: "最受歡迎評論排行",
  description: "查看社群中獲得最多讚的公開桌遊評論。",
  canonical: "/rankings/reviews",
});

function normalizePage(value: string | string[] | undefined) {
  const page = Number(typeof value === "string" ? value : undefined);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

async function generateMetadataContent({ searchParams }: ReviewsRankingsPageProps): Promise<Metadata> {
  const page = normalizePage((await searchParams).page);
  return { ...BASE_METADATA, ...(page > 1 ? { robots: { index: false, follow: true } } : {}) };
}

async function ReviewRankingsPage({ searchParams }: ReviewsRankingsPageProps) {
  const page = normalizePage((await searchParams).page);
  const result = await reviewsService.listPopularRankings({ page, pageSize: PAGE_SIZE });

  return (
    <section className="container py-8">
      <PageHeader eyebrow="排行榜" title="最受歡迎評論" description="依公開評論獲得的按讚數排名。" />
      <PaginatedCollection
        className="mt-6"
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        basePath="/rankings/reviews"
        query={{}}
        showPageSize={false}
        itemLabel="則評論"
      >
        <div className="rounded-2xl border border-(--border-default) bg-(--surface-default) px-3 sm:px-5">
          <ReviewRankingList items={result.data} />
        </div>
      </PaginatedCollection>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/rankings/reviews");
export default withServerErrorReference(ReviewRankingsPage, "/rankings/reviews");

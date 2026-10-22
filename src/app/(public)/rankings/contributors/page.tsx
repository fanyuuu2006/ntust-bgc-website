import type { Metadata } from "next";

import { ReviewContributorRankingList } from "@/components/(public)/rankings/ReviewContributorRankingList";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { PageHeader } from "@/components/PageHeader";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { createPublicMetadata } from "@/libs/seo";
import { reviewContributorRankingsService } from "@/services/rankings/review-contributor-rankings.service";

type PageProps = { searchParams: Promise<{ page?: string | string[] }> };
const PAGE_SIZE = 20;

const BASE_METADATA = createPublicMetadata({
  title: "評論貢獻排行",
  description: "看看誰分享了最多桌遊心得！",
  canonical: "/rankings/contributors",
});

async function generateMetadataContent({ searchParams }: PageProps): Promise<Metadata> {
  const value = Number((await searchParams).page);
  return { ...BASE_METADATA, ...(Number.isInteger(value) && value > 1 ? { robots: { index: false, follow: true } } : {}) };
}

async function ReviewContributorRankingsPage({ searchParams }: PageProps) {
  const rawPage = Number((await searchParams).page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const result = await reviewContributorRankingsService.list({ page, pageSize: PAGE_SIZE });

  return (
    <section className="container py-8">
      <PageHeader eyebrow="排行榜" title="評論貢獻排行" description="看看誰分享了最多桌遊心得！" />
      <PaginatedCollection className="mt-5" page={result.page} pageSize={result.pageSize} total={result.total} totalPages={result.totalPages} basePath="/rankings/contributors" query={{}} showPageSize={false} itemLabel="位貢獻者">
        <div className="rounded-2xl border border-(--border-default) bg-(--surface-default) px-3 sm:px-5">
          <ReviewContributorRankingList items={result.data} />
        </div>
      </PaginatedCollection>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/rankings/contributors");
export default withServerErrorReference(ReviewContributorRankingsPage, "/rankings/contributors");

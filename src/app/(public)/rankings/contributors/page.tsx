import type { Metadata } from "next";

import { ReviewContributorRankingList } from "@/components/(public)/rankings/ReviewContributorRankingList";
import { ContributorRankingSearchForm } from "@/components/(public)/rankings/ContributorRankingSearchForm";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { createPublicMetadata } from "@/libs/seo";
import { reviewContributorRankingsService } from "@/services/rankings/review-contributor-rankings.service";

type PageProps = { searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[]; q?: string | string[] }> };
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const BASE_METADATA = createPublicMetadata({
  title: "評論貢獻排行",
  description: "看看誰分享了最多桌遊心得！",
  canonical: "/rankings/contributors",
});

async function generateMetadataContent({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const value = Number(params.page);
  const hasSearch = typeof params.q === "string" && params.q.trim().length > 0;
  return { ...BASE_METADATA, ...(Number.isInteger(value) && value > 1 || hasSearch ? { robots: { index: false, follow: true } } : {}) };
}

async function ReviewContributorRankingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = Number(params.page);
  const rawPageSize = Number(params.pageSize);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize as 10 | 20 | 50) ? rawPageSize : 20;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : undefined;
  const result = await reviewContributorRankingsService.list({ page, pageSize, search });

  return (
    <section className="container py-8">
      <PageHeader breadcrumb={<Breadcrumbs items={[{ href: "/", label: "首頁" }, { href: "/rankings", label: "排行榜" }, { label: "評論貢獻排行" }]} />} eyebrow="排行榜" title="評論貢獻排行" description="看看誰分享了最多桌遊心得！" />
      <ContributorRankingSearchForm search={search} total={result.total} pageSize={pageSize} />
      <PaginatedCollection className="mt-5" page={result.page} pageSize={result.pageSize} total={result.total} totalPages={result.totalPages} basePath="/rankings/contributors" query={{ q: search, pageSize: pageSize === 20 ? undefined : pageSize }} pageSizeOptions={PAGE_SIZE_OPTIONS} itemLabel="位貢獻者">
        <div className="rounded-2xl border border-(--border-default) bg-(--surface-default) px-3 sm:px-5">
          <ReviewContributorRankingList items={result.data} hasSearch={Boolean(search)} />
        </div>
      </PaginatedCollection>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/rankings/contributors");
export default withServerErrorReference(ReviewContributorRankingsPage, "/rankings/contributors");

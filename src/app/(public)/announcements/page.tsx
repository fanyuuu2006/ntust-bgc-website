import { AnnouncementList } from "@/components/(public)/announcements/AnnouncementList";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination/Pagination";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { classifyQuerySeo } from "@/libs/query-seo";
import {
  normalizePageSizeOption,
  readSingleQueryValue,
} from "@/libs/query-params";
import { announcementsService } from "@/services/announcements/announcements.service";
import { buildQueryString } from "@/utils/url";
import { parsePage } from "@/utils/pagination";
import type { Metadata } from "next";

const ANNOUNCEMENTS_METADATA = {
  title: "社團公告",
  description: "查看臺科大桌遊社最新社團公告與活動消息。",
  alternates: {
    canonical: "/announcements",
  },
} satisfies Metadata;

type AnnouncementsSearchParams = {
  [key: string]: string | string[] | undefined;
};

type Props = {
  searchParams: Promise<AnnouncementsSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const { indexable } = classifyQuerySeo(params, {
    page: "1",
    pageSize: "10",
  });

  return {
    ...ANNOUNCEMENTS_METADATA,
    ...(indexable
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

export default async function AnnouncementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = normalizePageSizeOption(params.pageSize, [10, 20, 50], 10);
  const search = readSingleQueryValue(params.search);
  const announcements = await announcementsService.listPublished({
    page,
    pageSize,
    search,
  });
  const clearSearchQuery = buildQueryString({ page: 1, pageSize });
  const clearSearchHref = `/announcements?${clearSearchQuery}`;

  return (
    <section>
      <div className="container py-8">
        <div className="mx-auto max-w-5xl">
          <PageHeader
            eyebrow="最新消息"
            title="社團公告"
            description="社團最新消息與活動公告。"
          />

          <form
            method="GET"
            action="/announcements"
            className="mt-6 grid min-w-0 gap-2 max-w-3xl sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="pageSize" value={pageSize} />
            <ClearableSearchInput
              id="announcement-search"
              initialValue={search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋公告標題或內容"
              aria-label="搜尋公告"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:w-auto"
            >
              搜尋
            </Button>
          </form>

          <div className="mt-6">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-2">
              <p className="font-semibold text-(--text-primary)">全部公告</p>
              <p
                aria-live="polite"
                className="text-sm tabular-nums text-(--text-muted)"
              >
                共 {announcements.total} 筆
              </p>
            </div>
            {announcements.data.length ? (
              <AnnouncementList announcements={announcements.data} />
            ) : search || page > 1 ? (
              <QueryEmptyState
                title={search ? "沒有符合搜尋條件的公告" : "這一頁沒有公告"}
                clearHref="/announcements"
              />
            ) : (
              <EmptyState title="目前尚無已發布公告" compact />
            )}
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={announcements.total}
            totalPages={announcements.totalPages}
            basePath="/announcements"
            pageSizeOptions={[10, 20, 50]}
            query={{ search }}
            showPageSize={false}
            className="mt-5"
          />
        </div>
      </div>
    </section>
  );
}

import { AnnouncementList } from "@/components/(public)/announcements/AnnouncementList";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination/Pagination";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { announcementsService } from "@/services/announcements/announcements.service";
import { buildQueryString } from "@/utils/url";

type Props = {
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
};

export default async function AnnouncementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 10));
  const search = params.search?.trim() || undefined;
  const announcements = await announcementsService.listPublished({
    page,
    pageSize,
    search,
  });
  const clearSearchQuery = buildQueryString({ page: 1, pageSize });
  const clearSearchHref = `/announcements?${clearSearchQuery}`;

  return (
    <section className="py-8">
      <div className="container">
        <div className="mx-auto max-w-5xl space-y-6">
          <PageHeader
            eyebrow="最新消息"
            title="社團公告"
            description="社課、活動與社員服務的重要通知。"
          />

          <form
            method="GET"
            action="/announcements"
            className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
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

          <Pagination
            page={page}
            pageSize={pageSize}
            total={announcements.total}
            totalPages={announcements.totalPages}
            basePath="/announcements"
            pageSizeOptions={[10, 20, 50]}
            query={{ search }}
            showPageSize={false}
          />
        </div>
      </div>
    </section>
  );
}

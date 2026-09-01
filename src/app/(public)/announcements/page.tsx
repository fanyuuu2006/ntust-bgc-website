import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { announcementsService } from "@/services/announcements/announcements.service";
import { formatDate } from "@/utils/date";

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

  return (
    <section className="container space-y-6 py-8">
      <PageHeader
        eyebrow="最新消息"
        title="社團公告"
        description="社課、活動與社員服務的重要通知。"
      />

      <Card className="rounded-xl p-3">
        <form className="flex gap-2">
          <label className="sr-only" htmlFor="announcement-search">
            搜尋公告
          </label>
          <Input
            id="announcement-search"
            name="search"
            type="search"
            defaultValue={search}
            placeholder="搜尋公告標題或內容"
            className="min-w-0 flex-1 bg-(--primary-background)"
          />
          <Button type="submit">搜尋</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {announcements.data.length ? (
          announcements.data.map((announcement) => (
            <Link
              key={announcement.id}
              href={`/announcements/${announcement.id}`}
              className="card rounded-2xl p-5"
            >
              <p className="text-xs text-(--muted)">
                {announcement.published_at
                  ? formatDate(announcement.published_at)
                  : formatDate(announcement.created_at)}
              </p>
              <h2 className="mt-2 text-lg font-bold text-(--foreground)">
                {announcement.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-(--muted)">
                {announcement.content}
              </p>
            </Link>
          ))
        ) : (
          <EmptyState
            title={search ? "沒有符合搜尋條件的公告。" : "目前尚無已發布公告。"}
            compact
          />
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
      />
    </section>
  );
}

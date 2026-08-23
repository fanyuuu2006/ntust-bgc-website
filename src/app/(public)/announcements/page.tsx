import Link from "next/link";

import { Pagination } from "@/components/Pagination/Pagination";
import { announcementsService } from "@/services/announcements/announcements.service";
import { formatDate } from "@/utils/date";

type Props = { searchParams: Promise<{ page?: string; pageSize?: string; search?: string }> };

export default async function AnnouncementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 10));
  const search = params.search?.trim() || undefined;
  const announcements = await announcementsService.listPublished({ page, pageSize, search });
  return <section className="container space-y-6 py-8"><header><p className="text-sm font-semibold text-(--primary)">最新消息</p><h1 className="mt-1 text-3xl font-bold">社團公告</h1><p className="mt-2 text-sm text-(--muted)">社課、活動與社員服務的重要通知。</p></header>
    <form className="card flex gap-2 rounded-xl p-3"><label className="sr-only" htmlFor="announcement-search">搜尋公告</label><input id="announcement-search" name="search" defaultValue={search} placeholder="搜尋公告標題或內容" className="min-w-0 flex-1 rounded-lg border border-(--border) bg-(--primary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)" /><button className="btn primary rounded-lg px-4 py-2 text-sm" type="submit">搜尋</button></form>
    <div className="space-y-3">{announcements.data.length ? announcements.data.map((announcement) => <Link key={announcement.id} href={`/announcements/${announcement.id}`} className="card block rounded-2xl p-5"><p className="text-xs text-(--muted)">{announcement.published_at ? formatDate(announcement.published_at) : formatDate(announcement.created_at)}</p><h2 className="mt-2 text-lg font-bold text-(--foreground)">{announcement.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-(--muted)">{announcement.content}</p></Link>) : <div className="card rounded-2xl p-8 text-center text-sm text-(--muted)">{search ? "沒有符合搜尋條件的公告。" : "目前尚無已發布公告。"}</div>}</div>
    <Pagination page={page} pageSize={pageSize} total={announcements.total} totalPages={announcements.totalPages} basePath="/announcements" pageSizeOptions={[10, 20, 50]} query={{ search }} />
  </section>;
}

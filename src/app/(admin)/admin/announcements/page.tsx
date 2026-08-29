import Link from "next/link";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { AnnouncementStatusBadge } from "@/components/(admin)/admin/announcements/AnnouncementStatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { announcementsService } from "@/services/announcements/announcements.service";
import { formatAdminDateTime } from "@/utils/date";

const fields = ["title", "created_at", "updated_at", "published_at"] as const;

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; orderBy?: string; orderDirection?: string; page?: string }> }) {
  const params = await searchParams;
  const orderBy = fields.includes(params.orderBy as (typeof fields)[number]) ? params.orderBy as (typeof fields)[number] : "created_at";
  const orderDirection = params.orderDirection === "asc" ? "asc" : "desc";
  const published = params.status === "published" ? true : params.status === "draft" ? false : undefined;
  const result = await announcementsService.listForAdmin({ search: params.search, published, orderBy, orderDirection, page: Math.max(1, Number(params.page) || 1), pageSize: 30 });
  const query = { search: params.search, status: params.status, orderBy, orderDirection, page: params.page };

  return <>
    <HeadingSection title="公告管理" description="管理社團公告、草稿與發布狀態。" actions={<ButtonLink href="/admin/announcements/new">+ 新增公告</ButtonLink>} />
    <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
      <form className="flex flex-col gap-3 rounded-xl border border-(--border-default) bg-(--surface-default) p-3 shadow-(--shadow-base) lg:flex-row">
        <Input name="search" defaultValue={params.search} placeholder="搜尋公告" aria-label="搜尋公告" className="min-w-0 flex-1" />
        <Select name="status" defaultValue={params.status ?? ""} aria-label="依公告狀態篩選"><option value="">全部狀態</option><option value="draft">草稿</option><option value="published">已發布</option></Select>
        <Button type="submit" className="w-full lg:w-auto">搜尋</Button>
      </form>
      {result.data.length === 0 ? <EmptyState title="沒有符合條件的公告" description="調整搜尋或篩選條件後再試。" /> : <>
        <div className="grid gap-3 md:hidden">{result.data.map((announcement) => <Card key={announcement.id} className="rounded-xl p-4"><div className="flex items-start justify-between gap-3"><Link href={`/admin/announcements/${announcement.id}/edit`} className="font-semibold hover:underline">{announcement.title}</Link><AnnouncementStatusBadge published={announcement.is_published} /></div><p className="mt-2 text-sm text-(--text-muted)">建立：{formatAdminDateTime(announcement.created_at)}</p><ButtonLink href={`/admin/announcements/${announcement.id}/edit`} variant="outline" size="sm" className="mt-3">編輯</ButtonLink></Card>)}</div>
        <Card className="hidden overflow-x-auto rounded-xl p-0 md:block"><Table><TableHeader><TableRow><SortableTableHeader label="標題" column="title" basePath="/admin/announcements" query={query} /><TableHead>狀態</TableHead><SortableTableHeader label="建立時間" column="created_at" basePath="/admin/announcements" query={query} /><SortableTableHeader label="更新時間" column="updated_at" basePath="/admin/announcements" query={query} /><SortableTableHeader label="發布時間" column="published_at" basePath="/admin/announcements" query={query} /><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{result.data.map((announcement) => <TableRow key={announcement.id}><TableCell className="font-medium">{announcement.title}</TableCell><TableCell><AnnouncementStatusBadge published={announcement.is_published} /></TableCell><TableCell>{formatAdminDateTime(announcement.created_at)}</TableCell><TableCell>{formatAdminDateTime(announcement.updated_at)}</TableCell><TableCell>{formatAdminDateTime(announcement.published_at)}</TableCell><TableCell><ButtonLink href={`/admin/announcements/${announcement.id}/edit`} variant="outline" size="sm">編輯</ButtonLink></TableCell></TableRow>)}</TableBody></Table></Card>
      </>}
    </section>
  </>;
}

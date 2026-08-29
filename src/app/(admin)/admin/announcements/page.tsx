import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { AnnouncementStatusBadge } from "@/components/(admin)/admin/announcements/AnnouncementStatusBadge";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { announcementsService } from "@/services/announcements/announcements.service";
import { formatAdminDateTime } from "@/utils/date";

const fields = ["title", "created_at", "updated_at", "published_at"] as const;

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    orderBy?: string;
    orderDirection?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.search === "" || params.status === "") {
    const normalized = new URLSearchParams();
    if (params.search?.trim()) normalized.set("search", params.search.trim());
    if (params.status) normalized.set("status", params.status);
    if (params.orderBy) normalized.set("orderBy", params.orderBy);
    if (params.orderDirection) {
      normalized.set("orderDirection", params.orderDirection);
    }
    if (params.page) normalized.set("page", params.page);
    if (params.pageSize) normalized.set("pageSize", params.pageSize);
    redirect(
      normalized.size ? "/admin/announcements?" + normalized : "/admin/announcements",
    );
  }

  const orderBy = fields.includes(
    params.orderBy as (typeof fields)[number],
  )
    ? (params.orderBy as (typeof fields)[number])
    : "created_at";
  const orderDirection = params.orderDirection === "asc" ? "asc" : "desc";
  const published =
    params.status === "published"
      ? true
      : params.status === "draft"
        ? false
        : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : 20;
  const result = await announcementsService.listForAdmin({
    search: params.search,
    published,
    orderBy,
    orderDirection,
    page,
    pageSize,
  });
  const query = {
    search: params.search,
    status: params.status,
    orderBy,
    orderDirection,
  };
  const clearSearchParams = new URLSearchParams();
  if (params.status) clearSearchParams.set("status", params.status);
  if (params.orderBy) clearSearchParams.set("orderBy", params.orderBy);
  if (params.orderDirection) {
    clearSearchParams.set("orderDirection", params.orderDirection);
  }
  if (params.pageSize) clearSearchParams.set("pageSize", params.pageSize);
  const clearSearchHref = clearSearchParams.size
    ? "/admin/announcements?" + clearSearchParams
    : "/admin/announcements";

  return (
    <>
      <HeadingSection
        title="公告管理"
        description="管理公告草稿與發布狀態。"
        actions={<ButtonLink href="/admin/announcements/new">新增公告</ButtonLink>}
      />

      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <form>
          <AdminToolbar className="grid grid-cols-[minmax(0,1fr)_auto] items-center lg:grid-cols-[minmax(0,1fr)_10rem_auto]">
            <ClearableSearchInput
              initialValue={params.search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋公告"
              aria-label="搜尋公告"
              className="min-w-0"
            />
            <Select
              name="status"
              defaultValue={params.status ?? ""}
              aria-label="依發布狀態篩選"
              className="col-span-2 w-full lg:col-span-1"
            >
              <option value="">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
            </Select>
            <Button type="submit" className="shrink-0">
              搜尋
            </Button>
          </AdminToolbar>
        </form>

        {result.data.length === 0 ? (
          <EmptyState
            title="目前沒有符合條件的公告"
            description="請調整搜尋或篩選條件後再試。"
          />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {result.data.map((announcement) => (
                <Card key={announcement.id} className="rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={"/admin/announcements/" + announcement.id + "/edit"}
                        className="block truncate font-semibold hover:underline"
                      >
                        {announcement.title}
                      </Link>
                    </div>
                    <span className="shrink-0">
                      <AnnouncementStatusBadge published={announcement.is_published} />
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-(--text-muted)">
                    建立於 {formatAdminDateTime(announcement.created_at)}
                  </p>
                  <ButtonLink
                    href={"/admin/announcements/" + announcement.id + "/edit"}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    編輯
                  </ButtonLink>
                </Card>
              ))}
            </div>

            <Card className="hidden overflow-x-auto rounded-xl p-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      label="標題"
                      column="title"
                      basePath="/admin/announcements"
                      query={query}
                    />
                    <TableHead>狀態</TableHead>
                    <SortableTableHeader
                      label="建立時間"
                      column="created_at"
                      basePath="/admin/announcements"
                      query={query}
                    />
                    <SortableTableHeader
                      label="更新時間"
                      column="updated_at"
                      basePath="/admin/announcements"
                      query={query}
                    />
                    <SortableTableHeader
                      label="發布時間"
                      column="published_at"
                      basePath="/admin/announcements"
                      query={query}
                    />
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell className="font-medium">{announcement.title}</TableCell>
                      <TableCell>
                        <AnnouncementStatusBadge published={announcement.is_published} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatAdminDateTime(announcement.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatAdminDateTime(announcement.updated_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatAdminDateTime(announcement.published_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ButtonLink
                          href={"/admin/announcements/" + announcement.id + "/edit"}
                          variant="outline"
                          size="sm"
                        >
                          編輯
                        </ButtonLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={result.total}
          totalPages={result.totalPages}
          basePath="/admin/announcements"
          pageSizeOptions={[10, 20, 50, 100]}
          query={query}
        />
      </section>
    </>
  );
}

import { buildAdminListHref, buildAdminReturnHref } from "@/utils/admin-return";
import Link from "next/link";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { AnnouncementStatusBadge } from "@/components/(admin)/admin/announcements/AnnouncementStatusBadge";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { announcementsService } from "@/services/announcements/announcements.service";
import {
  normalizePageSizeOption,
  readSingleQueryValue,
  type QueryParamValue,
} from "@/libs/query-params";
import { formatAdminDateTime } from "@/utils/date";
import { parsePage } from "@/utils/pagination";

const fields = ["title", "created_at", "updated_at", "published_at"] as const;

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: QueryParamValue;
    status?: QueryParamValue;
    orderBy?: QueryParamValue;
    orderDirection?: QueryParamValue;
    page?: QueryParamValue;
    pageSize?: QueryParamValue;
  }>;
}) {
  const rawParams = await searchParams;
  const params = {
    search: readSingleQueryValue(rawParams.search),
    status: readSingleQueryValue(rawParams.status),
    orderBy: readSingleQueryValue(rawParams.orderBy),
    orderDirection: readSingleQueryValue(rawParams.orderDirection),
    page: readSingleQueryValue(rawParams.page),
    pageSize: readSingleQueryValue(rawParams.pageSize),
  };

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
  const page = parsePage(params.page);
  const pageSize = normalizePageSizeOption(params.pageSize, [10, 20, 50, 100], 20);
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
    pageSize,
  };
  const returnTo = buildAdminListHref("/admin/announcements", { ...query, page });
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
        actions={<ButtonLink href={buildAdminReturnHref("/admin/announcements/new", returnTo, "/admin/announcements")}>新增公告</ButtonLink>}
      />

      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <AdminToolbar className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem] md:items-center">
          <form className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" aria-label="搜尋公告">
            <PreservedQueryFields query={query} ownedKeys={["search"]} />
            <ClearableSearchInput
              initialValue={params.search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋公告標題或內容"
              aria-label="搜尋公告標題或內容"
              className="w-full"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto">
              搜尋
            </Button>
          </form>
            <ImmediateQuerySelect
              appliedQuery={query}
              basePath="/admin/announcements"
              queryKey="status"
              value={params.status ?? ""}
              aria-label="依發布狀態篩選"
              className="w-full"
            >
              <option value="">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
            </ImmediateQuerySelect>
            <ImmediateQuerySelect appliedQuery={query} basePath="/admin/announcements" queryKey="orderBy" value={orderBy} aria-label="公告排序" className="w-full">
              <option value="created_at">最近建立</option>
              <option value="updated_at">最近更新</option>
              <option value="published_at">最近發布</option>
              <option value="title">標題</option>
            </ImmediateQuerySelect>
        </AdminToolbar>

        {result.data.length === 0 && Boolean(params.search || params.status || page > 1) ? (
          <QueryEmptyState
            title="找不到符合條件的公告"
            description="請調整搜尋或篩選條件後再試。"
            clearHref="/admin/announcements"
          />
        ) : result.data.length === 0 ? (
          <EmptyState
            title="目前沒有公告"
          />
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {result.data.map((announcement) => (
                <Card key={announcement.id} className="rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={buildAdminReturnHref(`/admin/announcements/${announcement.id}/edit`, returnTo, "/admin/announcements")}
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
                    href={buildAdminReturnHref(`/admin/announcements/${announcement.id}/edit`, returnTo, "/admin/announcements")}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    編輯
                  </ButtonLink>
                </Card>
              ))}
            </div>

            <Card className="hidden overflow-x-auto rounded-xl p-0 lg:block">
              <Table className="min-w-[820px]">
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
                          href={buildAdminReturnHref(`/admin/announcements/${announcement.id}/edit`, returnTo, "/admin/announcements")}
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

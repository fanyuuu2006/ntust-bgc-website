import { buildAdminListHref } from "@/utils/admin-return";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { EventActions } from "@/components/(admin)/admin/events/EventActions";
import { EventRecords } from "@/components/(admin)/admin/events/EventRecords";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { eventsService } from "@/services/events/events.service";
import {
  normalizePageSizeOption,
  readSingleQueryValue,
  type QueryParamValue,
} from "@/libs/query-params";
import { parsePage } from "@/utils/pagination";
const ORDER_FIELDS = ["name", "start_time", "end_time", "created_at"] as const;
type Status = "upcoming" | "ongoing" | "ended";
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderBy?: QueryParamValue;
    orderDirection?: QueryParamValue;
    page?: QueryParamValue;
    pageSize?: QueryParamValue;
    search?: QueryParamValue;
    status?: QueryParamValue;
  }>;
}) {
  const rawParams = await searchParams;
  const params = {
    orderBy: readSingleQueryValue(rawParams.orderBy),
    orderDirection: readSingleQueryValue(rawParams.orderDirection),
    page: readSingleQueryValue(rawParams.page),
    pageSize: readSingleQueryValue(rawParams.pageSize),
    search: readSingleQueryValue(rawParams.search),
    status: readSingleQueryValue(rawParams.status),
  };
  const orderBy = ORDER_FIELDS.includes(
    params.orderBy as (typeof ORDER_FIELDS)[number],
  )
    ? (params.orderBy as (typeof ORDER_FIELDS)[number])
    : "start_time";
  const orderDirection = params.orderDirection === "asc" ? "asc" : "desc";
  const status = (["upcoming", "ongoing", "ended"] as const).includes(
    params.status as Status,
  )
    ? (params.status as Status)
    : undefined;
  const page = parsePage(params.page);
  const result = await eventsService.getEvents({
    page,
    pageSize: normalizePageSizeOption(params.pageSize, [10, 20, 50, 100], 20),
    orderBy,
    orderDirection,
    search: params.search?.trim() || undefined,
    status,
  });
  const pageSize = normalizePageSizeOption(params.pageSize, [10, 20, 50, 100], 20);
  const clearSearchParams = new URLSearchParams();
  if (params.status) clearSearchParams.set("status", params.status);
  if (params.orderBy) clearSearchParams.set("orderBy", params.orderBy);
  if (params.orderDirection) clearSearchParams.set("orderDirection", params.orderDirection);
  if (params.pageSize) clearSearchParams.set("pageSize", params.pageSize);
  const clearSearchHref = clearSearchParams.size
    ? `/admin/events?${clearSearchParams.toString()}`
    : "/admin/events";
  return (
    <>
      <HeadingSection
        title="活動管理"
        description="建立、編輯與管理社團活動，可進入活動詳情管理簽到。"
        actions={<EventActions />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <AdminToolbar className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem] md:items-center">
          <form className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" aria-label="搜尋活動">
            <PreservedQueryFields query={{ search: params.search, status, orderBy, orderDirection, pageSize }} ownedKeys={["search"]} />
            <ClearableSearchInput initialValue={params.search} clearHref={clearSearchHref} name="search" placeholder="搜尋活動名稱或說明" className="w-full" />
            <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
          </form>
            <ImmediateQuerySelect appliedQuery={{ search: params.search, status, orderBy, orderDirection, pageSize }} basePath="/admin/events" queryKey="status" value={status ?? ""} aria-label="活動狀態" className="w-full">
              <option value="">全部狀態</option>
              <option value="upcoming">即將開始</option>
              <option value="ongoing">進行中</option>
              <option value="ended">已結束</option>
            </ImmediateQuerySelect>
            <ImmediateQuerySelect appliedQuery={{ search: params.search, status, orderBy, orderDirection, pageSize }} basePath="/admin/events" queryKey="orderBy" value={orderBy} aria-label="活動排序" className="w-full">
              <option value="start_time">開始時間</option>
              <option value="end_time">結束時間</option>
              <option value="name">活動名稱</option>
              <option value="created_at">建立時間</option>
            </ImmediateQuerySelect>
        </AdminToolbar>
        <EventRecords
          events={result.data}
          returnTo={buildAdminListHref("/admin/events", { search: params.search, status, orderBy, orderDirection, page, pageSize })}
          hasQuery={Boolean(params.search || status || Number(params.page) > 1)}
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={result.total}
          totalPages={result.totalPages}
          basePath="/admin/events"
          pageSizeOptions={[10, 20, 50, 100]}
          query={{ search: params.search, status, orderBy, orderDirection }}
        />
      </section>
    </>
  );
}

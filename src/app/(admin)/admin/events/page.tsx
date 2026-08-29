import { redirect } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { EventActions } from "@/components/(admin)/admin/events/EventActions";
import { EventRecords } from "@/components/(admin)/admin/events/EventRecords";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { eventsService } from "@/services/events/events.service";
const ORDER_FIELDS = ["name", "start_time", "end_time", "created_at"] as const;
type Status = "upcoming" | "ongoing" | "ended";
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderBy?: string;
    orderDirection?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.search === "" || params.status === "") {
    const normalized = new URLSearchParams();
    if (params.search?.trim()) normalized.set("search", params.search.trim());
    if (params.status) normalized.set("status", params.status);
    if (params.orderBy) normalized.set("orderBy", params.orderBy);
    if (params.orderDirection) normalized.set("orderDirection", params.orderDirection);
    if (params.page) normalized.set("page", params.page);
    if (params.pageSize) normalized.set("pageSize", params.pageSize);
    redirect(normalized.size ? `/admin/events?${normalized}` : "/admin/events");
  }
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
  const result = await eventsService.getEvents({
    page: Math.max(1, Number(params.page) || 1),
    pageSize: [10, 20, 50, 100].includes(Number(params.pageSize))
      ? Number(params.pageSize)
      : 20,
    orderBy,
    orderDirection,
    search: params.search?.trim() || undefined,
    status,
  });
  const pageSize = [10, 20, 50, 100].includes(Number(params.pageSize)) ? Number(params.pageSize) : 20;
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
        <form>
          <AdminToolbar className="grid grid-cols-[minmax(0,1fr)_auto] items-center lg:grid-cols-[minmax(0,1fr)_10rem_auto]">
            <ClearableSearchInput initialValue={params.search} clearHref={clearSearchHref} name="search" placeholder="搜尋活動名稱或說明" className="min-w-0" />
            <Select name="status" defaultValue={status ?? ""} className="col-span-2 w-full lg:col-span-1">
              <option value="">全部狀態</option>
              <option value="upcoming">即將開始</option>
              <option value="ongoing">進行中</option>
              <option value="ended">已結束</option>
            </Select>
            <Button type="submit" className="shrink-0">搜尋</Button>
          </AdminToolbar>
        </form>
        <EventRecords events={result.data} />
        <Pagination
          page={Math.max(1, Number(params.page) || 1)}
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
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";

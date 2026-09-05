import { notFound, redirect } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { AttendanceActions } from "@/components/(admin)/admin/events/AttendanceActions";
import { AttendanceRecords } from "@/components/(admin)/admin/events/AttendanceRecords";
import { EventStatusBadge } from "@/components/(admin)/admin/events/EventStatusBadge";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { eventsService } from "@/services/events/events.service";
import { formatDateTime } from "@/utils/date";

export default async function AdminEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; orderDirection?: string; page?: string; pageSize?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (query.search === "") {
    const normalized = new URLSearchParams();
    if (query.orderDirection) normalized.set("orderDirection", query.orderDirection);
    if (query.page) normalized.set("page", query.page);
    if (query.pageSize) normalized.set("pageSize", query.pageSize);
    redirect(normalized.size ? `/admin/events/${id}?${normalized}` : `/admin/events/${id}`);
  }

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = [10, 20, 50].includes(Number(query.pageSize)) ? Number(query.pageSize) : 20;
  const orderDirection = query.orderDirection === "asc" ? "asc" : "desc";
  const [event, records] = await Promise.all([
    eventsService.getEventById(id),
    eventsService.listAttendancesForAdmin(id, {
      page,
      pageSize,
      orderDirection,
      search: query.search?.trim() || undefined,
    }),
  ]);

  if (!event) notFound();

  const clearSearchParams = new URLSearchParams();
  if (query.orderDirection) clearSearchParams.set("orderDirection", query.orderDirection);
  if (query.pageSize) clearSearchParams.set("pageSize", query.pageSize);
  const clearSearchHref = clearSearchParams.size
    ? `/admin/events/${event.id}?${clearSearchParams}`
    : `/admin/events/${event.id}`;

  return (
    <>
      <HeadingSection
        title={event.name}
        description={`${formatDateTime(event.start_time)} 至 ${formatDateTime(event.end_time)}`}
        actions={<AttendanceActions eventId={event.id} />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-default) pb-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-lg font-semibold">簽到管理</h2>
            <EventStatusBadge event={event} />
          </div>
          <ButtonLink href="/admin/events" size="sm" variant="outline">返回活動管理</ButtonLink>
        </div>
        {event.description ? <p className="whitespace-pre-wrap text-sm leading-7 text-(--text-muted)">{event.description}</p> : null}
        <form>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={pageSize} />
          <AdminToolbar className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <ClearableSearchInput initialValue={query.search} clearHref={clearSearchHref} name="search" placeholder="搜尋使用者名稱、姓名、Email 或學號" aria-label="搜尋簽到名單" />
            <Select name="orderDirection" defaultValue={orderDirection} aria-label="簽到時間排序" className="w-full sm:w-auto">
              <option value="desc">最新簽到</option>
              <option value="asc">最早簽到</option>
            </Select>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
          </AdminToolbar>
        </form>
        <AttendanceRecords
          eventId={event.id}
          eventName={event.name}
          records={records.data}
          hasQuery={Boolean(query.search || page > 1)}
        />
        <Pagination page={page} pageSize={pageSize} total={records.total} totalPages={records.totalPages} basePath={`/admin/events/${event.id}`} pageSizeOptions={[10, 20, 50]} query={{ search: query.search, orderDirection }} />
      </section>
    </>
  );
}

import { notFound } from "next/navigation";
import { EventDetailHeader } from "@/components/(admin)/admin/events/EventDetailHeader";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { AttendanceActions } from "@/components/(admin)/admin/events/AttendanceActions";
import { AttendanceRecords } from "@/components/(admin)/admin/events/AttendanceRecords";
import { AdminExportMenu } from "@/components/(admin)/admin/exports/AdminExportMenu";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { Button } from "@/components/ui/Button";
import { eventsService } from "@/services/events/events.service";
import { getAdminReturnPath } from "@/utils/admin-return";
import { normalizePageSizeOption, readSingleQueryValue, type QueryParamValue } from "@/libs/query-params";
import { parsePage } from "@/utils/pagination";

export default async function EventAttendancesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: QueryParamValue; search?: QueryParamValue; orderDirection?: QueryParamValue; page?: QueryParamValue; pageSize?: QueryParamValue }> }) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams]);
  const returnTo = getAdminReturnPath(rawQuery.returnTo, "/admin/events");
  const search = readSingleQueryValue(rawQuery.search);
  const orderDirection = readSingleQueryValue(rawQuery.orderDirection) === "asc" ? "asc" : "desc";
  const page = parsePage(readSingleQueryValue(rawQuery.page));
  const pageSize = normalizePageSizeOption(readSingleQueryValue(rawQuery.pageSize), [10, 20, 50], 20);
  const [event, records] = await Promise.all([eventsService.getEventById(id), eventsService.listAttendancesForAdmin(id, { page, pageSize, orderDirection, search: search?.trim() || undefined })]);
  if (!event) notFound();
  const attendancePath = `/admin/events/${event.id}/attendances`;
  const clearParams = new URLSearchParams({ returnTo, orderDirection, pageSize: String(pageSize) });
  const clearSearchHref = `${attendancePath}?${clearParams}`;
  const query = { returnTo, search, orderDirection, pageSize };
  return <>
    <EventDetailHeader event={event} returnTo={returnTo} active="attendances" breadcrumbTail={{ label: "簽到管理" }} actions={<><AdminExportMenu domain="event-attendance" query={{ eventId: event.id, search, orderDirection }} /><AttendanceActions eventId={event.id} /></>} />
    <section className="space-y-3 px-4 pb-6 sm:px-6 lg:px-8">
      <AdminToolbar className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><form className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2" aria-label="搜尋簽到紀錄"><PreservedQueryFields query={query} ownedKeys={["search"]} /><ClearableSearchInput initialValue={search} clearHref={clearSearchHref} name="search" placeholder="搜尋姓名或 Email" aria-label="搜尋簽到紀錄" /><Button type="submit" variant="primary" className="w-auto">搜尋</Button></form><ImmediateQuerySelect appliedQuery={query} basePath={attendancePath} queryKey="orderDirection" value={orderDirection} aria-label="簽到排序" className="w-full sm:w-auto"><option value="desc">最新優先</option><option value="asc">最早優先</option></ImmediateQuerySelect></AdminToolbar>
      <PaginatedCollection className="space-y-3" page={page} pageSize={pageSize} total={records.total} totalPages={records.totalPages} basePath={attendancePath} pageSizeOptions={[10, 20, 50]} query={{ returnTo, search, orderDirection }}><AttendanceRecords key={JSON.stringify({ search, orderDirection, page, pageSize })} returnTo={returnTo} returnPath={attendancePath} eventId={event.id} eventName={event.name} records={records.data} hasQuery={Boolean(search || page > 1)} /></PaginatedCollection>
    </section>
  </>;
}

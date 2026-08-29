import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { EventManager } from "@/components/(admin)/admin/events/EventManager";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    search?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
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
    pageSize: 100,
    orderBy,
    orderDirection,
    search: params.search?.trim() || undefined,
    status,
  });
  return (
    <>
      <HeadingSection
        title="活動管理"
        description="建立、編輯與管理社團活動，可進入活動詳情管理簽到。"
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <form>
          <AdminToolbar>
            <Input
              name="search"
              defaultValue={params.search}
              placeholder="搜尋活動名稱或說明"
              className="min-w-0 flex-1"
            />
            <Select
              name="status"
              defaultValue={status ?? ""}
              className="lg:w-36"
            >
              <option value="">全部狀態</option>
              <option value="upcoming">即將開始</option>
              <option value="ongoing">進行中</option>
              <option value="ended">已結束</option>
            </Select>
            <Button type="submit">搜尋</Button>
          </AdminToolbar>
        </form>
        <EventManager events={result.data} />
      </section>
    </>
  );
}

import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { EventManager } from "@/components/(admin)/admin/events/EventManager";
import { eventsService } from "@/services/events/events.service";
const ORDER_FIELDS = ["name", "start_time", "end_time", "created_at"] as const;
type OrderField = (typeof ORDER_FIELDS)[number];
export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ orderBy?: string; orderDirection?: string; page?: string }> }) {
  const params = await searchParams;
  const orderBy: OrderField = ORDER_FIELDS.includes(params.orderBy as OrderField) ? params.orderBy as OrderField : "start_time";
  const orderDirection = params.orderDirection === "asc" ? "asc" : "desc";
  const result = await eventsService.getEvents({ page: Math.max(1, Number(params.page) || 1), pageSize: 100, orderBy, orderDirection });
  return <><HeadingSection title="活動管理" description="建立、編輯與管理社團活動；可進入活動詳情管理簽到。" /><section className="px-4 pb-6 sm:px-6 lg:px-8"><EventManager events={result.data} /></section></>;
}

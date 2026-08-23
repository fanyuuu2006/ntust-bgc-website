import type { Event } from "@/types/database";
import { cn } from "@/utils/className";
import { Badge } from "@/components/ui/Badge";
export function EventStatusBadge({ event }: { event: Event }) {
  // Status is intentionally evaluated at render time; it is derived from the current clock.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const status = new Date(event.start_time).getTime() > now ? "即將開始" : new Date(event.end_time).getTime() >= now ? "進行中" : "已結束";
  const classes = status === "進行中" ? "bg-green-50 text-green-700" : status === "即將開始" ? "bg-blue-50 text-blue-700" : "bg-(--secondary-background) text-(--muted)";
  return <Badge className={cn(classes)}>{status}</Badge>;
}

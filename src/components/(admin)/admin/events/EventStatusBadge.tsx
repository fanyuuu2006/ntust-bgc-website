import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { Event } from "@/types/database";

type EventDisplayStatus = "即將開始" | "進行中" | "已結束";

const toneByStatus: Record<EventDisplayStatus, BadgeTone> = {
  即將開始: "info",
  進行中: "success",
  已結束: "neutral",
};

export function EventStatusBadge({ event }: { event: Event }) {
  // Status is intentionally derived at render time from the current clock.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const status: EventDisplayStatus =
    new Date(event.start_time).getTime() > now
      ? "即將開始"
      : new Date(event.end_time).getTime() >= now
        ? "進行中"
        : "已結束";

  return <Badge tone={toneByStatus[status]}>{status}</Badge>;
}

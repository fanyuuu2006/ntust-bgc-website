import type { BorrowingStatus } from "@/types/database";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

export const BORROWING_STATUS_LABEL: Record<BorrowingStatus, string> = {
  pending: "待審核",
  approved: "已核准",
  rejected: "已拒絕",
  borrowed: "借出中",
  returned: "已歸還",
  cancelled: "已取消",
};

const BORROWING_STATUS_TONE: Record<BorrowingStatus, BadgeTone> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  borrowed: "success",
  returned: "neutral",
  cancelled: "neutral",
};

export function BorrowingStatusBadge({ status, className }: { status: BorrowingStatus; className?: string }) {
  return <Badge tone={BORROWING_STATUS_TONE[status]} className={className}>{BORROWING_STATUS_LABEL[status]}</Badge>;
}

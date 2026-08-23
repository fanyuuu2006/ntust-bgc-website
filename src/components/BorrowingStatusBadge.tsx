import type { BorrowingStatus } from "@/types/database";
import { cn } from "@/utils/className";

export const BORROWING_STATUS_LABEL: Record<BorrowingStatus, string> = {
  pending: "待審核",
  approved: "已核准",
  rejected: "已拒絕",
  borrowed: "借出中",
  returned: "已歸還",
};

const BORROWING_STATUS_CLASS: Record<BorrowingStatus, string> = {
  pending: "text-(--game-yellow)", approved: "text-(--game-blue)", rejected: "text-(--game-red)", borrowed: "text-(--game-green)", returned: "text-(--muted)",
};

export function BorrowingStatusBadge({ status, className }: { status: BorrowingStatus; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-(--border) bg-(--secondary-background) px-2 py-0.5 text-xs font-medium", BORROWING_STATUS_CLASS[status], className)}>{BORROWING_STATUS_LABEL[status]}</span>;
}

import type { BoardGameStatus } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
export const BOARD_GAME_STATUS_LABEL: Record<BoardGameStatus, string> = {
  available: "可借用",
  borrowed: "借出中",
  maintenance: "維護中",
  lost: "遺失",
  damaged: "損壞",
  retired: "已除役",
};
const tones: Record<
  BoardGameStatus,
  "success" | "info" | "warning" | "danger" | "neutral"
> = {
  available: "success",
  borrowed: "info",
  maintenance: "warning",
  lost: "danger",
  damaged: "danger",
  retired: "neutral",
};
export function BoardGameStatusBadge({ status }: { status: BoardGameStatus }) {
  return <Badge tone={tones[status]}>{BOARD_GAME_STATUS_LABEL[status]}</Badge>;
}

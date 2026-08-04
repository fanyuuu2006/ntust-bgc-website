import type { BoardGameStatus } from "@/types/database";
import { cn } from "@/utils/className";

export const BOARD_GAME_STATUS_LABEL: Record<BoardGameStatus, string> = {
  available: "可借用",
  borrowed: "已借出",
  maintenance: "維護中",
  lost: "遺失",
  damaged: "損壞",
  retired: "已除役",
};

const STATUS_TEXT_COLOR: Record<BoardGameStatus, string> = {
  available: "text-(--game-green)",
  borrowed: "text-(--game-blue)",
  maintenance: "text-(--game-yellow)",
  lost: "text-(--game-red)",
  damaged: "text-(--game-red)",
  retired: "text-(--muted)",
};

type BoardGameStatusBadgeProps = {
  status: BoardGameStatus;
};

export function BoardGameStatusBadge({ status }: BoardGameStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-(--border) bg-(--secondary-background) px-2.5 py-1 text-xs font-medium",
        STATUS_TEXT_COLOR[status],
      )}
    >
      {BOARD_GAME_STATUS_LABEL[status]}
    </span>
  );
}

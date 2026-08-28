import type { BoardGameStatus } from "@/types/database";
import { STATUS_META } from "@/app/(public)/board-games/constants";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const BOARD_GAME_STATUS_TONE: Record<BoardGameStatus, BadgeTone> = {
  available: "success",
  borrowed: "info",
  maintenance: "warning",
  lost: "danger",
  damaged: "danger",
  retired: "neutral",
};

type BoardGameStatusBadgeProps = {
  status: BoardGameStatus;
  className?: string;
};

export function BoardGameStatusBadge({
  status,
  className,
}: BoardGameStatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <Badge
      tone={BOARD_GAME_STATUS_TONE[status]}
      title={meta.description}
      className={className}
    >
      {meta.label}
    </Badge>
  );
}

import type { BoardGameStatus } from "@/types/database";
import { STATUS_META } from "@/app/(public)/board-games/constants";
import { cn } from "@/utils/className";

type BoardGameStatusBadgeProps = {
  status: BoardGameStatus;
  compact?: boolean;
  className?: string;
};

export function BoardGameStatusBadge({
  status,
  compact = false,
  className,
}: BoardGameStatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
        meta.toneClass,
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", meta.dotClass)}
        aria-hidden
      />
      {compact ? meta.label : `${meta.label}`}
    </span>
  );
}

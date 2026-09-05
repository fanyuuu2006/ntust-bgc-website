import type { BoardGameStats } from "@/services/board-games/board-games.types";
import { cn } from "@/utils/className";

type BoardGamePopularityProps = React.HTMLAttributes<HTMLParagraphElement> & {
  stats: BoardGameStats;
};

export function BoardGamePopularity({
  stats,
  className,
  ...props
}: BoardGamePopularityProps) {
  const completedBorrowCount = stats.completedBorrowCount;

  if (completedBorrowCount <= 0) return null;

  return (
    <p
      className={cn(
        "text-xs leading-5 text-(--text-secondary) sm:text-sm",
        className,
      )}
      {...props}
    >
      <span className="font-medium">熱門度</span>
      <span aria-hidden="true"> · </span>
      {completedBorrowCount} 次借用
    </p>
  );
}

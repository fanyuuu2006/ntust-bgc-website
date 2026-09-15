import { RatingStars, formatAverageRating } from "@/components/(public)/board-games/RatingStars";
import type { BoardGameStats } from "@/services/board-games/board-games.types";
import { cn } from "@/utils/className";

type BoardGameRatingMetadataProps = React.HTMLAttributes<HTMLParagraphElement> & {
  stats?: Pick<BoardGameStats, "averageRating" | "ratingCount">;
};

export function BoardGameRatingMetadata({
  stats,
  className,
  ...props
}: BoardGameRatingMetadataProps) {
  if (!stats || stats.averageRating == null || stats.ratingCount <= 0) return null;

  const average = formatAverageRating(stats.averageRating);

  return (
    <p
      className={cn(
        "flex min-w-0 items-center gap-1 text-xs leading-5 text-(--text-secondary)",
        className,
      )}
      {...props}
    >
      <RatingStars
        rating={stats.averageRating}
        size="xs"
        label={`平均評分 ${average}，滿分 5 分，共 ${stats.ratingCount} 人評分`}
        className="shrink-0"
      />
      <span aria-hidden="true" className="min-w-0 shrink-0 whitespace-nowrap font-medium tabular-nums text-(--text-primary)">
        {average}（{stats.ratingCount}）
      </span>
    </p>
  );
}

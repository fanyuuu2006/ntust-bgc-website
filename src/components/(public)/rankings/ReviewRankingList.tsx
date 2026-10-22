import { Heart } from "lucide-react";

import { RatingStars } from "@/components/(public)/board-games/RatingStars";
import { RankingList, type RankingDisplayItem } from "@/components/(public)/rankings/RankingList";
import type { PublicReviewRankingItem } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";

function reviewHref(review: PublicReviewRankingItem) {
  return `/board-games/${review.boardGame.id}?review=${review.id}&reviewSort=newest#review-${review.id}`;
}

function toDisplayItem(review: PublicReviewRankingItem, compact: boolean): RankingDisplayItem {
  return {
    key: review.id,
    rank: review.globalRank,
    href: reviewHref(review),
    accessibleLabel: `查看 ${review.author.name} 對《${review.boardGame.name}》的評論`,
    title: review.content,
    titleClassName: "font-medium text-(--text-primary)",
    titleClampClassName: compact ? "line-clamp-1" : "line-clamp-2",
    supportingContent: (
      <span className="grid min-w-0 gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="max-w-[min(10rem,45%)] truncate">{review.author.name}</span>
          <span aria-hidden="true">·</span>
          <span className="min-w-0 truncate">{review.boardGame.name}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1">
          <RatingStars rating={review.rating} label={`${review.rating} 分`} size="xs" />
          <span className="tabular-nums">{review.rating}.0</span>
        </span>
          </span>
          <time dateTime={review.createdAt} className="truncate">{formatDateTime(review.createdAt)}</time>
      </span>
    ),
    primaryMetric: (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text-primary)" aria-label={`${review.likeCount} 個讚`}>
        <Heart aria-hidden="true" className="size-4 text-(--interactive-primary)" />
        <strong className="tabular-nums">{review.likeCount}</strong>
      </span>
    ),
    primaryMetricOnMobileSide: true,
  };
}

export function ReviewRankingList({ items, compact = false, emptyDescription }: {
  items: PublicReviewRankingItem[];
  compact?: boolean;
  emptyDescription?: string;
}) {
  return (
    <RankingList
      items={items.map((item) => toDisplayItem(item, compact))}
      emptyTitle="尚無熱門評論"
      emptyDescription={emptyDescription ?? "目前還沒有含文字內容的公開評論。"}
    />
  );
}

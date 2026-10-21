import { Heart } from "lucide-react";

import { RatingStars } from "@/components/(public)/board-games/RatingStars";
import { RankingList, type RankingDisplayItem } from "@/components/(public)/rankings/RankingList";
import { UserAvatar } from "@/components/UserAvatar";
import type { PublicReviewRankingItem } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";

function reviewHref(review: PublicReviewRankingItem) {
  return `/board-games/${review.boardGame.id}?review=${review.id}&reviewSort=newest#review-${review.id}`;
}

function toDisplayItem(review: PublicReviewRankingItem): RankingDisplayItem {
  return {
    key: review.id,
    rank: review.globalRank,
    href: reviewHref(review),
    accessibleLabel: `查看 ${review.author.name} 對《${review.boardGame.name}》的評論`,
    media: <UserAvatar user={review.author} className="size-12 rounded-full sm:size-14" />,
    title: review.content,
    supportingContent: (
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="max-w-40 truncate">{review.author.name}</span>
        <span aria-hidden="true">·</span>
        <span className="max-w-52 truncate">{review.boardGame.name}</span>
        <span className="inline-flex items-center gap-1">
          <RatingStars rating={review.rating} label={`${review.rating} 分`} size="xs" />
          <span className="tabular-nums">{review.rating}.0</span>
        </span>
      </span>
    ),
    primaryMetric: (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text-primary)" aria-label={`${review.likeCount} 個讚`}>
        <Heart aria-hidden="true" className="size-4 text-(--interactive-primary)" />
        <strong className="tabular-nums">{review.likeCount}</strong>
      </span>
    ),
    secondaryMetric: <time dateTime={review.createdAt}>{formatDateTime(review.createdAt)}</time>,
  };
}

export function ReviewRankingList({ items }: { items: PublicReviewRankingItem[] }) {
  return (
    <RankingList
      items={items.map(toDisplayItem)}
      emptyTitle="尚無熱門評論"
      emptyDescription="目前還沒有含文字內容的公開評論。"
    />
  );
}

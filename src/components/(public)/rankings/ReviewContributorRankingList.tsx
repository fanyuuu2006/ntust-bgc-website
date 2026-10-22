import { Heart, MessageSquareText } from "lucide-react";

import { RankingList, type RankingDisplayItem } from "@/components/(public)/rankings/RankingList";
import { UserAvatar } from "@/components/UserAvatar";
import type { ReviewContributorRankingItem } from "@/services/rankings/review-contributor-rankings.types";

function toDisplayItem(item: ReviewContributorRankingItem): RankingDisplayItem {
  return {
    key: item.user.id,
    rank: item.globalRank,
    href: `/profile/${item.user.id}`,
    accessibleLabel: `查看 ${item.user.name} 的公開個人頁`,
    title: item.user.name,
    titleClampClassName: "line-clamp-1",
    media: (
      <UserAvatar
        user={item.user}
        className="size-10 rounded-full"
        width={40}
        height={40}
      />
    ),
    primaryMetric: (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text-primary)" aria-label={`${item.reviewCount} 則有效公開評論`}>
        <MessageSquareText aria-hidden="true" className="size-4 text-(--interactive-primary)" />
        <strong className="tabular-nums">{item.reviewCount}</strong><span>則評論</span>
      </span>
    ),
    secondaryMetric: (
      <span className="inline-flex items-center gap-1" aria-label={`累積獲得 ${item.receivedLikeCount} 個讚`}>
        <Heart aria-hidden="true" className="size-3.5" />
        <span className="tabular-nums">{item.receivedLikeCount} 個讚</span>
      </span>
    ),
  };
}

export function ReviewContributorRankingList({ items }: { items: ReviewContributorRankingItem[] }) {
  return (
    <RankingList
      items={items.map(toDisplayItem)}
      emptyTitle="尚無評論貢獻排行資料"
      emptyDescription="使用者主動參與並留下有效公開評論後，就會顯示在這裡。"
      emptyWithinContainer
    />
  );
}

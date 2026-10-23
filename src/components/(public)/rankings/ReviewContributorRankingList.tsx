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
      <UserAvatar user={item.user} className="size-10 rounded-full" width={40} height={40} />
    ),
    primaryMetric: (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text-primary)" aria-label={`${item.reviewCount} 則評論`}>
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

export function ReviewContributorRankingList({
  items,
  hasSearch = false,
}: {
  items: ReviewContributorRankingItem[];
  hasSearch?: boolean;
}) {
  return (
    <RankingList
      items={items.map(toDisplayItem)}
      emptyTitle={hasSearch ? "找不到符合搜尋條件的結果" : "目前還沒有人上榜"}
      emptyDescription={hasSearch ? "請更換關鍵字或清除搜尋條件。" : "目前還沒有符合條件的評論貢獻者。"}
      emptyWithinContainer
    />
  );
}

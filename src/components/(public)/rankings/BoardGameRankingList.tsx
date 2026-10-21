import { RatingStars, formatAverageRating } from "@/components/(public)/board-games/RatingStars";
import { RankingList, type RankingDisplayItem } from "@/components/(public)/rankings/RankingList";
import { BoardGameImage } from "@/components/BoardGameImage";
import type { BoardGameRanking } from "@/repositories/board-game-statistics.repository";
import type { BoardGameDiscoveryItem, BoardGameRankingItem } from "@/services/board-games/board-games.types";

function RatingMetric({ item, subtle = false }: { item: BoardGameDiscoveryItem; subtle?: boolean }) {
  if (item.stats.averageRating === null) return <span className="text-sm text-(--text-muted)">尚無評分</span>;
  const rating = formatAverageRating(item.stats.averageRating);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <RatingStars rating={item.stats.averageRating} label={`平均 ${rating} 分，共 ${item.stats.ratingCount} 人評分`} size={subtle ? "xs" : "sm"} />
      <span className={subtle ? "text-xs tabular-nums text-(--text-muted)" : "text-sm font-medium tabular-nums text-(--text-primary)"}>
        {subtle ? rating : `${rating} (${item.stats.ratingCount})`}
      </span>
    </span>
  );
}

function primaryMetric(item: BoardGameDiscoveryItem, ranking: BoardGameRanking) {
  if (ranking === "rating") return <RatingMetric item={item} />;
  if (ranking === "reviews") return <span className="text-sm font-medium text-(--text-primary)"><strong className="text-base tabular-nums">{item.stats.reviewCount}</strong> 則文字評論</span>;
  if (ranking === "borrowed") return <span className="text-sm font-medium text-(--text-primary)"><strong className="text-base tabular-nums">{item.stats.completedBorrowCount}</strong> 次借用</span>;
  return <span className="text-sm font-medium text-(--text-primary)"><strong className="tabular-nums">{item.stats.completedBorrowCount}</strong> 次借用</span>;
}

function secondaryMetric(item: BoardGameDiscoveryItem, ranking: BoardGameRanking) {
  if (ranking === "popular") return `${item.stats.ratingCount} 人評分 · ${item.stats.reviewCount} 則評論`;
  if (ranking === "rating") return undefined;
  if (ranking === "reviews") return item.stats.averageRating === null ? undefined : <RatingMetric item={item} subtle />;
  return `${item.stats.reviewCount} 則文字評論`;
}

function toDisplayItem(item: BoardGameRankingItem, ranking: BoardGameRanking, compact: boolean): RankingDisplayItem {
  return {
    key: item.id,
    rank: item.globalRank,
    href: `/board-games/${item.id}`,
    title: item.name,
    media: <BoardGameImage boardGame={item} className="aspect-square size-14 rounded-xl border border-(--border-default) object-contain sm:size-16" />,
    primaryMetric: primaryMetric(item, ranking),
    secondaryMetric: compact ? undefined : secondaryMetric(item, ranking),
  };
}

export function BoardGameRankingList({ items, ranking, compact = false, emptyDescription }: {
  items: BoardGameRankingItem[];
  ranking: BoardGameRanking;
  compact?: boolean;
  emptyDescription?: string;
}) {
  const displayItems = items.map((item) => toDisplayItem(item, ranking, compact));
  return <RankingList items={displayItems} emptyDescription={emptyDescription ?? "累積評分、評論或借用紀錄後，就會顯示在這裡。"} />;
}

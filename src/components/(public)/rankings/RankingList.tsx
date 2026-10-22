import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/className";

export type RankingDisplayItem = {
  key: string;
  rank: number;
  href?: string;
  accessibleLabel?: string;
  media?: React.ReactNode;
  title: React.ReactNode;
  titleClassName?: string;
  titleClampClassName?: string;
  supportingContent?: React.ReactNode;
  primaryMetric: React.ReactNode;
  secondaryMetric?: React.ReactNode;
  /** 評論等需要固定右側指標的清單，在窄螢幕也維持第三欄。 */
  primaryMetricOnMobileSide?: boolean;
};

export function RankingPosition({ rank }: { rank: number }) {
  const podiumColor = rank === 1
    ? "var(--status-warning)"
    : rank === 2
      ? "color-mix(in oklab, var(--text-primary) 62%, var(--surface-default))"
      : rank === 3
        ? "color-mix(in oklab, var(--status-warning) 65%, var(--status-danger))"
        : undefined;

  return (
    <span
      aria-label={`第 ${rank} 名`}
      className="inline-flex size-8 shrink-0 items-center justify-center text-sm font-bold tabular-nums text-(--text-secondary)"
      style={podiumColor ? { color: podiumColor } : undefined}
    >
      {rank}
    </span>
  );
}

export function RankingList({
  items,
  className,
  emptyTitle = "目前沒有排行榜資料",
  emptyDescription = "累積足夠資料後，就會顯示在這裡。",
  emptyWithinContainer = false,
}: {
  items: RankingDisplayItem[];
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyWithinContainer?: boolean;
}) {
  if (items.length === 0) return (
    <EmptyState
      compact
      title={emptyTitle}
      description={emptyDescription}
      className={emptyWithinContainer ? "rounded-none border-0 bg-transparent shadow-none" : undefined}
    />
  );

  return (
    <ol className={cn("divide-y divide-(--border-muted)", className)}>
      {items.map((item) => (
        <li key={item.key} className={cn("grid min-w-0 items-center gap-3 py-3.5 sm:gap-4", item.media ? "grid-cols-[2.5rem_3.5rem_minmax(0,1fr)] sm:grid-cols-[2.75rem_4rem_minmax(0,1fr)]" : "grid-cols-[2.5rem_minmax(0,1fr)] sm:grid-cols-[2.75rem_minmax(0,1fr)]")}>
          <RankingPosition rank={item.rank} />
          {item.media ? <div className="flex items-center">{item.media}</div> : null}
          <div className={cn("min-w-0", item.primaryMetricOnMobileSide ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3" : "sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6")}>
            <div className={cn("min-w-0", item.primaryMetricOnMobileSide && "col-start-1 row-span-2", "sm:col-start-1 sm:row-span-2")}>
              {item.href ? (
                <Link href={item.href} aria-label={item.accessibleLabel} className={cn("inline-flex max-w-full wrap-anywhere font-semibold leading-5 text-(--interactive-primary) hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)", item.titleClassName)}>
                  <span className={cn("line-clamp-2", item.titleClampClassName)}>{item.title}</span>
                </Link>
              ) : <div className={cn("line-clamp-2 font-semibold leading-5 text-(--text-primary)", item.titleClassName, item.titleClampClassName)}>{item.title}</div>}
              {item.supportingContent ? <div className="mt-1.5 text-xs text-(--text-muted)">{item.supportingContent}</div> : null}
            </div>
            <div className={cn(item.primaryMetricOnMobileSide ? "col-start-2 row-start-1 self-start" : "mt-1.5", "sm:col-start-2 sm:row-start-1 sm:mt-0 sm:flex sm:justify-end sm:text-right")}>{item.primaryMetric}</div>
            {item.secondaryMetric ? <div className="mt-1 text-xs text-(--text-muted) sm:col-start-2 sm:row-start-2 sm:flex sm:justify-end sm:text-right">{item.secondaryMetric}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

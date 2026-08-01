import Link from "next/link";
import { cn } from "@/utils/className";

export type HistoryStatusVariant = "success" | "warning" | "danger" | "muted";

export type HistoryItem = {
  key: string;
  /** 主要標題，例如桌遊名稱、社員類型、活動名稱 */
  title: string;
  /** 次要資訊，例如館藏編號、學年度 */
  subtitle?: string;
  /** 狀態顯示文字，例如「借用中」「已歸還」「已核准」 */
  statusLabel: string;
  statusVariant: HistoryStatusVariant;
  /** 已格式化好的日期字串 */
  date?: string;
};

export type HistoryGroup = {
  key: string;
  title: string;
  items: HistoryItem[];
  emptyText?: string;
  viewAllHref?: string;
};

type HistorySectionProps = React.HTMLAttributes<HTMLElement> & {
  groups: HistoryGroup[];
};

const STATUS_DOT_CLASS: Record<HistoryStatusVariant, string> = {
  success: "bg-(--game-green)",
  warning: "bg-(--game-yellow)",
  danger: "bg-(--game-red)",
  muted: "bg-(--muted)",
};

function HistoryItemRow({ item }: { item: HistoryItem }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-(--secondary-background) px-3 py-2">
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium text-(--foreground)"
          title={item.title}
        >
          {item.title}
        </p>
        {item.subtitle && (
          <p className="truncate text-xs text-(--muted)" title={item.subtitle}>
            {item.subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--foreground)">
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              STATUS_DOT_CLASS[item.statusVariant],
            )}
          />
          {item.statusLabel}
        </span>
        {item.date && (
          <span className="text-[0.6875rem] text-(--muted)">{item.date}</span>
        )}
      </div>
    </li>
  );
}

function HistoryGroupCard({ group }: { group: HistoryGroup }) {
  const hasItems = group.items.length > 0;

  return (
    <div className="card flex flex-col items-center rounded-xl p-4 sm:p-5">
      <div className="w-full mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-(--foreground) sm:text-base">
          {group.title}
        </h3>
        {hasItems &&
          (group.viewAllHref ? (
            <Link
              href={group.viewAllHref}
              className="shrink-0 rounded-sm text-xs font-medium text-(--primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              查看全部
            </Link>
          ) : (
            <span className="shrink-0 text-xs text-(--muted)">
              共 {group.items.length} 筆
            </span>
          ))}
      </div>

      {hasItems ? (
        <ul className="w-full flex flex-col gap-2">
          {group.items.map((item) => (
            <HistoryItemRow key={item.key} item={item} />
          ))}
        </ul>
      ) : (
        <p className="w-full h-full flex items-center justify-center rounded-xl border border-dashed border-(--border) px-3 py-6 text-center text-sm text-(--muted)">
          {group.emptyText ?? "尚無紀錄"}
        </p>
      )}
    </div>
  );
}

export function HistorySection({
  groups,
  className,
  ...rest
}: HistorySectionProps) {
  if (groups.length === 0) return null;

  return (
    <section
      className={className}
      aria-labelledby="profile-history-title"
      {...rest}
    >
      <div className="container">
        <div className="mb-3">
          <h2
            id="profile-history-title"
            className="text-base font-bold text-(--foreground) sm:text-lg"
          >
            歷史紀錄
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {groups.map((group) => (
            <HistoryGroupCard key={group.key} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}

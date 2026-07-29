import { cn } from "@/utils/className";

export type QuickStatAccent = "primary" | "green" | "yellow" | "red";

export type QuickStat = {
  key: string;
  label: string;
  value: string | number;
  /** 未指定時會依序輪流使用 primary / green / yellow / red */
  accent?: QuickStatAccent;
};

type QuickStatsSectionProps = React.HTMLAttributes<HTMLElement> & {
  stats: QuickStat[];
};

const DEFAULT_ACCENTS: QuickStatAccent[] = [
  "primary",
  "green",
  "yellow",
  "red",
];

const ACCENT_CLASS: Record<QuickStatAccent, string> = {
  primary: "",
  green: "green",
  yellow: "yellow",
  red: "red",
};

function formatStatValue(value: string | number) {
  return typeof value === "number" ? value.toLocaleString("zh-TW") : value;
}

function StatCard({
  stat,
  accent,
}: {
  stat: QuickStat;
  accent: QuickStatAccent;
}) {
  return (
    <div
      role="group"
      aria-label={`${stat.label}：${stat.value}`}
      className={cn(
        "card accent rounded-2xl p-4 text-center sm:p-5",
        ACCENT_CLASS[accent],
      )}
    >
      <p className="text-2xl leading-tight font-bold text-(--primary) tabular-nums sm:text-3xl">
        {formatStatValue(stat.value)}
      </p>
      <p className="mt-1.5 text-xs text-(--muted) sm:text-sm">{stat.label}</p>
    </div>
  );
}

export function QuickStatsSection({ stats, ...rest }: QuickStatsSectionProps) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <section {...rest}>
      <div className="container">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.key}
              stat={stat}
              accent={
                stat.accent ?? DEFAULT_ACCENTS[index % DEFAULT_ACCENTS.length]
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

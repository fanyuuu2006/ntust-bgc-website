import { cn } from "@/utils/className";

export type QuickStatAccent = "primary" | "green" | "yellow" | "red";

export type QuickStat = {
  key: string;
  label: string;
  value: string | number;
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
      className={cn("card accent rounded-2xl p-4 sm:p-5", ACCENT_CLASS[accent])}
    >
      <p className="text-xs font-medium text-(--muted)">{stat.label}</p>
      <p
        className="mt-2 truncate text-2xl font-bold text-(--foreground) tabular-nums sm:text-3xl"
        title={String(stat.value)}
      >
        {formatStatValue(stat.value)}
      </p>
    </div>
  );
}

export function QuickStatsSection({
  stats,
  className,
  ...rest
}: QuickStatsSectionProps) {
  if (stats.length === 0) return null;

  return (
    <section
      className={className}
      {...rest}
      aria-labelledby="profile-stats-title"
    >
      <div className="container">
        <div className="mb-3">
          <h2
            id="profile-stats-title"
            className="text-base font-bold text-(--foreground) sm:text-lg"
          >
            統計資訊
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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

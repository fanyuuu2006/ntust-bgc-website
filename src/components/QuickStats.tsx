import { cn } from "@/utils/className";

export type QuickStatAccent = "primary" | "green" | "yellow" | "red";

export type QuickStat = {
  key: string;
  label: string;
  value: string | number;
  accent?: QuickStatAccent;
};

type QuickStatsProps = {
  stats: QuickStat[];
};

const ACCENT_CARD_CLASS: Record<QuickStatAccent, string> = {
  primary: "",
  green: "green",
  yellow: "yellow",
  red: "red",
};

const DEFAULT_ACCENTS: QuickStatAccent[] = [
  "primary",
  "green",
  "yellow",
  "red",
];

function formatStatValue(value: string | number) {
  return typeof value === "number" ? value.toLocaleString("zh-TW") : value;
}

function StatCard({ stat }: { stat: QuickStat }) {
  const accent = stat.accent ?? "primary";
  const displayValue = formatStatValue(stat.value);

  return (
    <div
      className={cn(
        "card accent rounded-2xl p-4 sm:p-5",
        ACCENT_CARD_CLASS[accent],
      )}
      aria-label={`${stat.label}：${displayValue}`}
    >
      <p className="truncate text-xs font-medium text-(--muted)">
        {stat.label}
      </p>
      <p
        className={cn(
          "mt-2 truncate text-2xl font-bold tabular-nums sm:text-3xl",
        )}
        title={String(stat.value)}
      >
        {displayValue}
      </p>
    </div>
  );
}

export function QuickStats({ stats }: QuickStatsProps) {
  if (stats.length === 0) return null;

  return stats.map((stat, index) => (
    <StatCard
      key={stat.key}
      stat={{
        accent: stat.accent ?? DEFAULT_ACCENTS[index % DEFAULT_ACCENTS.length],
        ...stat,
      }}
    />
  ));
}

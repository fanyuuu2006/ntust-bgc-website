import { cn } from "@/utils/className";

export type BadgeTone = "neutral" | "success" | "info" | "warning" | "danger";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneTokens: Record<BadgeTone, string> = {
  neutral: "var(--status-neutral)",
  success: "var(--status-success)",
  info: "var(--status-info)",
  warning: "var(--status-warning)",
  danger: "var(--status-danger)",
} as const;

export function Badge({ tone = "neutral", className, style, ...props }: BadgeProps) {
  const token = toneTokens[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${token} 14%, var(--surface-default))`,
        borderColor: `color-mix(in oklab, ${token} 34%, var(--border-default))`,
        color: token,
        ...style,
      }}
      {...props}
    />
  );
}

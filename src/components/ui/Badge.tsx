import { cn } from "@/utils/className";
type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "info" | "warning" | "danger";
};
const tones = {
  neutral: "bg-(--secondary-background) text-(--muted)",
  success: "bg-green-50 text-green-700",
  info: "bg-blue-50 text-blue-700",
  warning: "bg-yellow-50 text-yellow-700",
  danger: "bg-red-50 text-red-700",
} as const;
export function Badge({ tone = "neutral", className, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

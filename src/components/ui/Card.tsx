import { cn } from "@/utils/className";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  surface?: "default" | "subtle" | "elevated";
  interactive?: boolean;
  selected?: boolean;
};

export function Card({
  className,
  surface = "default",
  interactive = false,
  selected = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "card rounded-2xl",
        surface === "subtle" && "bg-(--surface-subtle) shadow-none",
        surface === "elevated" && "bg-(--surface-elevated) shadow-(--shadow-card)",
        interactive && "interactive",
        selected && "selected",
        className,
      )}
      {...props}
    />
  );
}

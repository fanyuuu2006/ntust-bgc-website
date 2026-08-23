import { cn } from "@/utils/className";
export function EmptyState({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card rounded-xl p-8 text-center text-sm text-(--muted)",
        className,
      )}
      {...props}
    />
  );
}

import { cn } from "@/utils/className";
import { Card } from "./Card";

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
};

export function EmptyState({
  className,
  title,
  description,
  icon,
  action,
  compact = false,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <Card
      surface="subtle"
      className={cn(
        "rounded-xl text-center text-sm text-(--text-muted)",
        compact ? "p-5" : "p-8",
        className,
      )}
      {...props}
    >
      {icon ? <div aria-hidden="true" className="mb-3 flex justify-center text-(--text-muted)">{icon}</div> : null}
      {title ? <p className="font-medium text-(--text-primary)">{title}</p> : null}
      {description ? <p className={cn(title && "mt-1")}>{description}</p> : null}
      {action ?? children ? <div className="mt-4">{action ?? children}</div> : null}
    </Card>
  );
}

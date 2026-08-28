import { cn } from "@/utils/className";
import { Card } from "./Card";

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
};

export function EmptyState({
  className,
  title,
  description,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <Card
      surface="subtle"
      className={cn(
        "rounded-xl p-8 text-center text-sm text-(--text-muted)",
        className,
      )}
      {...props}
    >
      {title ? <p className="font-medium text-(--text-primary)">{title}</p> : null}
      {description ? <p className={cn(title && "mt-1")}>{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}

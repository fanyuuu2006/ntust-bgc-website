import { cn } from "@/utils/className";

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
    <div
      className={cn(
        "card rounded-xl p-8 text-center text-sm text-(--muted)",
        className,
      )}
      {...props}
    >
      {title ? <p className="font-medium text-(--foreground)">{title}</p> : null}
      {description ? <p className={cn(title && "mt-1")}>{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

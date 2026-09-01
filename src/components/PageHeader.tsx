import { cn } from "@/utils/className";

type PageHeaderProps = React.HTMLAttributes<HTMLElement> & {
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-sm font-semibold text-(--interactive-primary)">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn("font-bold text-(--text-primary)", eyebrow ? "mt-1 text-2xl sm:text-3xl" : "text-2xl sm:text-3xl")}>
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-(--text-muted) sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

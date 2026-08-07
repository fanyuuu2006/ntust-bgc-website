import type { ReactNode } from "react";
import { cn } from "@/utils/className";

type HeadingSectionProps = React.HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const HeadingSection = ({
  title,
  description,
  actions,
  className,
  ...rest
}: HeadingSectionProps) => {
  return (
    <section
      {...rest}
      className={cn(
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-(--foreground) sm:text-2xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-sm text-(--muted)">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </section>
  );
};

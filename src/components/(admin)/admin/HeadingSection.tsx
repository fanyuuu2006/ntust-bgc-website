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
        "flex flex-col gap-4 px-4 pt-6 pb-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight text-(--text-primary) sm:text-2xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-sm text-(--text-muted)">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto [&_.btn]:shrink-0 [&_.btn]:whitespace-nowrap">
          {actions}
        </div>
      )}
    </section>
  );
};

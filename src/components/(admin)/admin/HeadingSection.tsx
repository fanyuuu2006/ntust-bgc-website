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
        "flex flex-col gap-2.5 px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-6 sm:pb-4 lg:px-8",
        className,
      )}
    >
      <div className="min-w-0 wrap-anywhere">
        <h1 className="text-lg font-semibold leading-tight text-(--text-primary) sm:text-2xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-xs text-(--text-muted) sm:text-sm">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:gap-2 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {actions}
        </div>
      )}
    </section>
  );
};

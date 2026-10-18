import type { ReactNode } from "react";
import { cn } from "@/utils/className";

type HeadingSectionProps = React.HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  actions?: ReactNode;
  collection?: boolean;
};

export const HeadingSection = ({
  title,
  description,
  actions,
  collection = false,
  className,
  ...rest
}: HeadingSectionProps) => {
  return (
    <section
      {...rest}
      className={cn(
        "flex flex-col gap-2 px-4 pt-3 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-5 sm:pb-3 lg:px-8",
        collection && (actions ? "gap-0 py-2" : "p-0"),
        className,
      )}
    >
      <div className="min-w-0 wrap-anywhere">
        <h1
          className={cn(
            "text-lg font-semibold leading-tight text-(--text-primary) sm:text-2xl",
            collection && "sr-only",
          )}
        >
          {title}
        </h1>

        {description && (
          <p
            className={cn(
              "mt-1 text-xs text-(--text-muted) sm:text-sm",
              collection && "sr-only",
            )}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {actions}
        </div>
      )}
    </section>
  );
};

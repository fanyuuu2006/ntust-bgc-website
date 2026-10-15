import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/utils/className";

type HeadingSectionProps = React.HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  compactOnMobile?: boolean;
};

export const HeadingSection = ({
  title,
  description,
  actions,
  secondaryActions,
  compactOnMobile = false,
  className,
  ...rest
}: HeadingSectionProps) => {
  return (
    <section
      {...rest}
      className={cn(
        "flex flex-col gap-2 px-4 pt-3 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-5 sm:pb-3 lg:px-8",
        compactOnMobile && "py-1 sm:pt-5 sm:pb-3",
        className,
      )}
    >
      <div className="min-w-0 wrap-anywhere">
        <h1
          className={cn(
            "text-lg font-semibold leading-tight text-(--text-primary) sm:text-2xl",
            compactOnMobile && "sr-only sm:not-sr-only",
          )}
        >
          {title}
        </h1>

        {description && (
          <p
            className={cn(
              "mt-1 text-xs text-(--text-muted) sm:text-sm",
              compactOnMobile && "hidden sm:block",
            )}
          >
            {description}
          </p>
        )}
      </div>

      {(actions || secondaryActions) && (
        <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto sm:gap-2 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {actions}
          {secondaryActions ? (
            <>
              <details className="group relative sm:hidden">
                <summary
                  className="btn outline flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium marker:content-none"
                  aria-label="更多頁面操作"
                >
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                  更多
                </summary>
                <div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-2 rounded-xl border border-(--border-default) bg-(--surface-default) p-2 shadow-(--shadow-card) [&_.btn]:w-full [&_.btn]:justify-start [&>*]:w-full">
                  {secondaryActions}
                </div>
              </details>
              <div className="hidden items-center gap-2 sm:flex">
                {secondaryActions}
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
};

import Link from "next/link";

import { cn } from "@/utils/className";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label={"\u9eb5\u5305\u5c51\u5c0e\u89bd"} className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-(--text-muted)">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 max-w-full items-center gap-2">
              {index > 0 ? <span aria-hidden="true" className="shrink-0">/</span> : null}
              {item.href && !isCurrent ? (
                <Link href={item.href} title={item.label} className="min-w-0 max-w-full wrap-anywhere transition-colors hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} title={item.label} className="min-w-0 max-w-[min(70vw,32rem)] truncate font-medium text-(--text-primary) sm:max-w-[32rem]">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

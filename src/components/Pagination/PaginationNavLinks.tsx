import Link from "next/link";
import type { QueryValue } from "@/utils/url";
import { buildQueryString } from "@/utils/url";
import { cn } from "@/utils/className";

type PaginationNavLinksProps = React.HTMLAttributes<HTMLDivElement> & {
  page: number;
  pageSize: number;
  totalPages: number;
  basePath: string;
  query: Record<string, QueryValue>;
};

export function PaginationNavLinks({
  page,
  pageSize,
  totalPages,
  basePath,
  query,
  className,
  ...rest
}: PaginationNavLinksProps) {
  const hrefForPage = (targetPage: number) =>
    `${basePath}?${buildQueryString(query, { page: targetPage, pageSize })}`;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...rest}
    >
      <NavLink
        href={hrefForPage(page - 1)}
        label="上一頁"
        disabled={page <= 1}
      />
      <NavLink
        href={hrefForPage(page + 1)}
        label="下一頁"
        disabled={page >= totalPages}
      />
    </div>
  );
}

type NavLinkProps = {
  href: string;
  label: string;
  disabled: boolean;
};

function NavLink({ href, label, disabled }: NavLinkProps) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="btn shrink-0 rounded-md px-3 py-1 text-sm opacity-50"
      >
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className="btn shrink-0 rounded-md px-3 py-1 text-sm">
      {label}
    </Link>
  );
}

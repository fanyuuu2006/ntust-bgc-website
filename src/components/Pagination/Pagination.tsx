import { PaginationPageSizeSelect } from "@/components/Pagination/PaginationPageSizeSelect";
import { PaginationPageSelect } from "@/components/Pagination/PaginationPageSelect";
import { PaginationNavLinks } from "@/components/Pagination/PaginationNavLinks";
import { DEFAULT_PAGE_SIZE_OPTIONS, getPageRange } from "@/utils/pagination";
import type { QueryValue } from "@/utils/url";
import { cn } from "@/utils/className";

type PaginationProps = React.HTMLAttributes<HTMLElement> & {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  basePath: string;
  query: Record<string, QueryValue>;
  pageSizeOptions?: readonly number[];
  showPageSize?: boolean;
};

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  basePath,
  query,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showPageSize = true,
  className,
  ...rest
}: PaginationProps) {
  if (total === 0) return null;

  const { start, end } = getPageRange(page, pageSize, total);

  return (
    <nav
      aria-label="分頁"
      className={cn(
        "min-w-0 space-y-3 rounded-2xl",
        className,
      )}
      {...rest}
    >
      <p className="text-sm text-(--muted)">
        顯示 {start}–{end}，共 {total} 筆
      </p>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {showPageSize ? (
          <PaginationPageSizeSelect
            pageSize={pageSize}
            options={pageSizeOptions}
            basePath={basePath}
            query={query}
          />
        ) : null}

        {totalPages > 1 && (
          <div className="flex min-w-0 items-center justify-between gap-2 sm:ml-auto sm:justify-end">
            <PaginationNavLinks
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              basePath={basePath}
              query={query}
              direction="previous"
            />
            <PaginationPageSelect
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              basePath={basePath}
              query={query}
            />
            <PaginationNavLinks
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              basePath={basePath}
              query={query}
              direction="next"
            />
          </div>
        )}
      </div>
    </nav>
  );
}

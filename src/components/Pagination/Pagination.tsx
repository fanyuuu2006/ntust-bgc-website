import { PaginationPageSizeSelect } from "@/components/Pagination/PaginationPageSizeSelect";
import { PaginationPageSelect } from "@/components/Pagination/PaginationPageSelect";
import { PaginationNavLinks } from "@/components/Pagination/PaginationNavLinks";
import { DEFAULT_PAGE_SIZE_OPTIONS, getPageRange } from "@/utils/pagination";
import type { QueryValue } from "@/utils/url";
import { cn } from "@/utils/className";

type PaginationProps = React.HTMLAttributes<HTMLDivElement> & {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  basePath: string;
  query: Record<string, QueryValue>;
  pageSizeOptions?: readonly number[];
};

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  basePath,
  query,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
  ...rest
}: PaginationProps) {
  if (total === 0) return null;

  const { start, end } = getPageRange(page, pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...rest}
    >
      <p className="shrink-0 whitespace-nowrap text-sm text-(--muted)">
        顯示 {start}–{end}，共 {total} 筆
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <PaginationPageSizeSelect
          pageSize={pageSize}
          options={pageSizeOptions}
          basePath={basePath}
          query={query}
        />

        {totalPages > 1 && (
          <>
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
            />
          </>
        )}
      </div>
    </div>
  );
}

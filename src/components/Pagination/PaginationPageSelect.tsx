"use client";

import { useRouter } from "next/navigation";
import { buildQueryString, type QueryValue } from "@/utils/url";
import { cn } from "@/utils/className";
import { Select } from "@/components/ui/Select";

type PaginationPageSelectProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  page: number;
  pageSize: number;
  totalPages: number;
  basePath: string;
  query: Record<string, QueryValue>;
};

export function PaginationPageSelect({
  page,
  pageSize,
  totalPages,
  basePath,
  query,
  className,
  ...rest
}: PaginationPageSelectProps) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const queryString = buildQueryString(query, {
      page: event.target.value,
      pageSize,
    });

    router.push(`${basePath}?${queryString}`);
  }

  return (
    <label
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-(--muted)",
        className,
      )}
      {...rest}
    >
      頁面
      <Select
        value={page}
        onChange={handleChange}
        aria-label="目前頁碼"
        className="min-h-0 shrink-0 bg-(--surface-subtle) px-2 py-1 text-sm"
      >
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          return (
            <option key={pageNumber} value={pageNumber}>
              {pageNumber}
            </option>
          );
        })}
      </Select>
      / {totalPages}
    </label>
  );
}

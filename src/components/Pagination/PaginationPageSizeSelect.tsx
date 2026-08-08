"use client";

import { useRouter } from "next/navigation";
import { buildQueryString, type QueryValue } from "@/utils/url";
import { cn } from "@/utils/className";

type PaginationPageSizeSelectProps =
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    pageSize: number;
    options: readonly number[];
    basePath: string;
    query: Record<string, QueryValue>;
  };

export function PaginationPageSizeSelect({
  pageSize,
  options,
  basePath,
  query,
  className,
  ...rest
}: PaginationPageSizeSelectProps) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const queryString = buildQueryString(query, {
      pageSize: event.target.value,
      page: 1,
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
      每頁
      <select
        value={pageSize}
        onChange={handleChange}
        aria-label="每頁顯示筆數"
        className="shrink-0 rounded-md border border-(--border) bg-(--secondary-background) px-2 py-1 text-sm text-(--foreground) outline-none focus:border-(--primary)"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      筆
    </label>
  );
}

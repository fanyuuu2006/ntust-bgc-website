"use client";

import { useRouter } from "next/navigation";
import { buildQueryString, type QueryValue } from "@/utils/url";
import { cn } from "@/utils/className";
import { Select } from "@/components/ui/Select";

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
      <Select
        value={pageSize}
        onChange={handleChange}
        aria-label="每頁顯示筆數"
        className="min-h-0 shrink-0 bg-(--surface-subtle) px-2 py-1 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      筆
    </label>
  );
}

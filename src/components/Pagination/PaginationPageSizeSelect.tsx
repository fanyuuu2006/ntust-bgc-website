"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { cn } from "@/utils/className";
import { buildQueryString, type QueryValue } from "@/utils/url";

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
  const visibleOptions = options.includes(pageSize)
    ? options
    : [...options, pageSize].sort((left, right) => left - right);

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
        "flex items-center gap-1.5 whitespace-nowrap text-sm text-(--muted)",
        className,
      )}
      {...rest}
    >
      每頁
      <Select
        value={pageSize}
        onChange={handleChange}
        aria-label="每頁顯示筆數"
        className="min-h-10 w-auto bg-(--surface-subtle) px-2 py-1 text-sm"
      >
        {visibleOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      筆
    </label>
  );
}

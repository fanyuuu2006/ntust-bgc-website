import { cn } from "@/utils/className";
import { getPageRange } from "@/utils/pagination";

type PaginationSummaryProps = React.HTMLAttributes<HTMLParagraphElement> & {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unit?: string;
};

export function getPaginationSummary({ page, pageSize, total, totalPages }: Pick<PaginationSummaryProps, "page" | "pageSize" | "total" | "totalPages">) {
  if (total === 0) return null;
  const { start, end } = getPageRange(page, pageSize, total);
  return { start, end, total, page, totalPages, paginated: totalPages > 1 };
}

export function PaginationSummary({ page, pageSize, total, totalPages, unit = "筆", className, ...rest }: PaginationSummaryProps) {
  const summary = getPaginationSummary({ page, pageSize, total, totalPages });
  if (!summary) return null;
  return (
    <p className={cn("min-w-0 text-sm tabular-nums text-(--text-muted)", className)} {...rest}>
      {summary.paginated ? (
        <>
          {summary.start > 0 ? <span className="hidden sm:inline">顯示 {summary.start}–{summary.end}，</span> : null}
          共 {summary.total} {unit} · 第 {summary.page} / {summary.totalPages} 頁
        </>
      ) : <>共 {summary.total} {unit}</>}
    </p>
  );
}

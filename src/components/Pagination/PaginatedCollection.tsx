import { Pagination, type PaginationProps } from "@/components/Pagination/Pagination";
import { PaginationSummary } from "@/components/Pagination/PaginationSummary";
import { cn } from "@/utils/className";

type PaginatedCollectionProps = Omit<PaginationProps, "className"> & {
  children: React.ReactNode;
  summary?: React.ReactNode;
  itemLabel?: string;
  className?: string;
  summaryClassName?: string;
  paginationClassName?: string;
};

export function PaginatedCollection({
  children,
  summary,
  itemLabel = "筆",
  className,
  summaryClassName,
  paginationClassName,
  ...pagination
}: PaginatedCollectionProps) {
  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      {summary === undefined ? (
        <PaginationSummary
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          unit={itemLabel}
          className={summaryClassName}
        />
      ) : summary}
      {children}
      <Pagination {...pagination} className={paginationClassName} />
    </div>
  );
}

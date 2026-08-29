import { cn } from "@/utils/className";

export function AdminManagementQuery({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      aria-label="查詢條件"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

export function AdminManagementResults({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      aria-label="管理結果"
      className={cn("min-w-0 space-y-4", className)}
      {...props}
    />
  );
}

export function AdminManagementPagination({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-1", className)} {...props} />;
}

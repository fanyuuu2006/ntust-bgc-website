import Link from "next/link";

type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
};

function buildHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key !== "page" && value) params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function AdminPagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="分頁導覽"
      className="flex items-center justify-center gap-2 text-sm"
    >
      {hasPrevious ? (
        <Link
          href={buildHref(basePath, searchParams, page - 1)}
          className="btn outline px-3 py-1.5 text-xs"
        >
          上一頁
        </Link>
      ) : (
        <span className="btn outline px-3 py-1.5 text-xs opacity-50">
          上一頁
        </span>
      )}

      <span className="px-2 text-(--muted)">
        第 {page} / {totalPages} 頁，共 {total} 筆
      </span>

      {hasNext ? (
        <Link
          href={buildHref(basePath, searchParams, page + 1)}
          className="btn outline px-3 py-1.5 text-xs"
        >
          下一頁
        </Link>
      ) : (
        <span className="btn outline px-3 py-1.5 text-xs opacity-50">
          下一頁
        </span>
      )}
    </nav>
  );
}

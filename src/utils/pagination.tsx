const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function parsePage(value: string | undefined): number {
  return Math.max(1, Number(value) || 1);
}

export function parsePageSize(
  value: string | undefined,
  defaultPageSize: number,
  maxPageSize = 100,
): number {
  return Math.max(1, Math.min(maxPageSize, Number(value) || defaultPageSize));
}

export function getPageRange(page: number, pageSize: number, total: number) {
  const offset = (page - 1) * pageSize;

  if (total === 0 || offset >= total) {
    return { start: 0, end: 0 };
  }

  const start = offset + 1;
  const end = Math.min(page * pageSize, total);
  return { start, end };
}

export { DEFAULT_PAGE_SIZE_OPTIONS };

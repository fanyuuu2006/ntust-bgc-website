import {
  readSingleQueryValue,
  type QueryParamValue,
} from "@/libs/query-params";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function parsePage(value: QueryParamValue): number {
  const parsed = Number(readSingleQueryValue(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parsePageSize(
  value: QueryParamValue,
  defaultPageSize: number,
  maxPageSize = 100,
): number {
  const parsed = Number(readSingleQueryValue(value));
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(maxPageSize, parsed)
    : defaultPageSize;
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

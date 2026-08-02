export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_MAX_PAGE_SIZE = 100;

export const normalizePaginationOptions = ({
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
  maxPageSize = DEFAULT_MAX_PAGE_SIZE,
}: {
  page?: number;
  pageSize?: number;
  maxPageSize?: number;
}) => {
  const normalizedPage = Math.max(1, page);

  const normalizedPageSize = Math.min(maxPageSize, Math.max(1, pageSize));

  const from = (normalizedPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    from,
    to,
  };
};

export const buildPaginationResult = <T>(
  data: T[] | null,
  count: number | null,
  page: number,
  pageSize: number,
) => {
  const total = count ?? 0;
  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
};

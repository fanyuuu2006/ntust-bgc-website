export type OrderDirection = "asc" | "desc";

export type PaginationQuery = {
  page?: number;
  pageSize?: number;
  /** Server-owned ceiling for bounded internal reads such as Admin exports. */
  maxPageSize?: number;
};

export type OrderOptions<TField extends string> = {
  orderBy?: TField;
  orderDirection?: OrderDirection;
};

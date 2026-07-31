export type OrderDirection = "asc" | "desc";

export type PaginationQuery = {
  page?: number;
  pageSize?: number;
};

export type OrderOptions<TField extends string> = {
  orderBy?: TField;
  orderDirection?: OrderDirection;
};
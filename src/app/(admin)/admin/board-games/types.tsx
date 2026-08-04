export type BoardGamesQuery = {
  search?: string;
  status?: string[];
  category?: string[];
  location?: string[];
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  page?: number;
};

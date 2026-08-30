import type { BoardGameStatus } from "@/types/database";
import type { FindManyBoardGamesOptions } from "@/repositories/board-games.repository";

export type BoardGamesQuery = {
  search?: string;
  status?: BoardGameStatus;
  category?: string;
  location?: string;
  orderBy?: FindManyBoardGamesOptions["orderBy"];
  orderDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

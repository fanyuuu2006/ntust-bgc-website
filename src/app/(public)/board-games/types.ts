import type { BoardGameStatus } from "@/types/database";
import type { FindManyBoardGamesWithStatsOptions } from "@/repositories/board-game-statistics.repository";

export type BoardGamesQuery = {
  search?: string;
  status?: BoardGameStatus[];
  category?: string[];
  location?: string[];
  sort: string;
  orderBy: FindManyBoardGamesWithStatsOptions["orderBy"];
  orderDirection: "asc" | "desc";
};

import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import {
  buildPaginationResult,
  normalizePaginationOptions,
} from "@/repositories/shared/pagination";
import { isPostgrestRangeNotSatisfiable } from "@/repositories/shared/postgrest";
import {
  buildIlikePattern,
  buildIlikeSearch,
  buildNumericSearch,
} from "@/repositories/shared/search";
import type { OrderOptions, PaginationQuery } from "@/repositories/shared/types";
import type { BoardGameDiscoveryItem, BoardGameRankingItem, HomeBoardGameItem } from "@/services/board-games/board-games.types";
import type { BoardGameStatus } from "@/types/database";

export type BoardGameDiscoveryOrderBy =
  | "popular"
  | "rating"
  | "name"
  | "created_at"
  | "updated_at"
  | "inventory_number";

export type BoardGameRanking = "popular" | "rating" | "reviews" | "borrowed";

export type FindRankedBoardGamesOptions = PaginationQuery & {
  search?: string;
};

export type FindManyBoardGamesWithStatsOptions = PaginationQuery &
  OrderOptions<BoardGameDiscoveryOrderBy> & {
    search?: string;
    status?: BoardGameStatus | BoardGameStatus[];
    category_ids?: string[];
    location_ids?: string[];
  };

type BoardGameStatisticsRow = Omit<BoardGameDiscoveryItem, "stats"> & {
  completed_borrow_count: number | string;
  average_rating: number | string | null;
  rating_count: number | string;
  review_count: number | string;
};

type HomeBoardGameStatisticsRow = Omit<HomeBoardGameItem, "stats"> & Pick<
  BoardGameStatisticsRow,
  "completed_borrow_count" | "average_rating" | "rating_count" | "review_count"
>;

type BoardGameRankingRow = Omit<BoardGameStatisticsRow, "id" | "category" | "location"> & {
  board_game_id: string;
  global_rank: number | string;
  popularity_score: number | string;
  category_name: string | null;
  location_name: string | null;
};

function toStats(row: Pick<BoardGameStatisticsRow, "completed_borrow_count" | "average_rating" | "rating_count" | "review_count">) {
  return {
    completedBorrowCount: Number(row.completed_borrow_count),
    averageRating: row.average_rating === null ? null : Number(row.average_rating),
    ratingCount: Number(row.rating_count),
    reviewCount: Number(row.review_count),
  };
}

function toBoardGameWithStats(row: BoardGameStatisticsRow): BoardGameDiscoveryItem {
  const { completed_borrow_count, average_rating, rating_count, review_count, ...boardGame } = row;

  return {
    ...boardGame,
    stats: toStats({ completed_borrow_count, average_rating, rating_count, review_count }),
  };
}

function toHomeBoardGameWithStats(row: HomeBoardGameStatisticsRow): HomeBoardGameItem {
  const { completed_borrow_count, average_rating, rating_count, review_count, ...boardGame } = row;
  return {
    ...boardGame,
    stats: toStats({ completed_borrow_count, average_rating, rating_count, review_count }),
  };
}

function toBoardGameRankingItem(row: BoardGameRankingRow): BoardGameRankingItem {
  return {
    id: row.board_game_id,
    name: row.name,
    image: row.image,
    status: row.status,
    inventory_number: row.inventory_number,
    category: row.category_name === null ? null : { name: row.category_name },
    location: row.location_name === null ? null : { name: row.location_name },
    stats: toStats(row),
    globalRank: Number(row.global_rank),
    popularityScore: Number(row.popularity_score),
  };
}

async function findManyWithStats(
  options: FindManyBoardGamesWithStatsOptions = {},
) {
  const { page, pageSize, from, to } = normalizePaginationOptions({
    page: options.page,
    pageSize: options.pageSize,
  });
  const orderBy = options.orderBy ?? "popular";
  const orderDirection = options.orderDirection ?? "desc";

  const usesRankingView = orderBy === "popular" || orderBy === "rating";
  let query = supabase
    .from(usesRankingView ? "board_game_popularity_statistics" : "board_games_with_statistics")
    .select(usesRankingView
      ? "id:board_game_id,name,image,status,inventory_number,completed_borrow_count,average_rating,rating_count,review_count,category:board_game_categories(name),location:board_game_locations(name)"
      : "id,name,image,status,inventory_number,completed_borrow_count,average_rating,rating_count,review_count,category:board_game_categories(name),location:board_game_locations(name)", { count: "exact" });

  const keyword = options.search?.trim();
  if (keyword) {
    const conditions = [
      buildIlikeSearch(["name", "description"], keyword),
      buildNumericSearch(["inventory_number"], keyword),
    ].filter(Boolean);
    query = query.or(conditions.join(","));
  }

  if (options.status) {
    query = Array.isArray(options.status)
      ? query.in("status", options.status)
      : query.eq("status", options.status);
  }
  if (options.category_ids?.length) {
    query = query.in("category_id", options.category_ids);
  }
  if (options.location_ids?.length) {
    query = query.in("location_id", options.location_ids);
  }

  if (orderBy === "popular") {
    query = query
      .order("popularity_score", { ascending: false })
      .order("rating_count", { ascending: false })
      .order("completed_borrow_count", { ascending: false })
      .order("average_rating", { ascending: false, nullsFirst: false })
      .order("board_game_id", { ascending: true });
  } else if (orderBy === "rating") {
    query = query
      .order("bayesian_rating", { ascending: false, nullsFirst: false })
      .order("rating_count", { ascending: false })
      .order("average_rating", { ascending: false, nullsFirst: false })
      .order("completed_borrow_count", { ascending: false })
      .order("board_game_id", { ascending: true });
  } else {
    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .order("id", { ascending: true });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    if (!isPostgrestRangeNotSatisfiable(error)) {
      throwRepositoryError("查詢桌遊統計失敗", error);
    }

    let countQuery = supabase
      .from(usesRankingView ? "board_game_popularity_statistics" : "board_games_with_statistics")
      .select(usesRankingView ? "board_game_id" : "id", { count: "exact", head: true });

    if (keyword) {
      const conditions = [
        buildIlikeSearch(["name", "description"], keyword),
        buildNumericSearch(["inventory_number"], keyword),
      ].filter(Boolean);
      countQuery = countQuery.or(conditions.join(","));
    }
    if (options.status) {
      countQuery = Array.isArray(options.status)
        ? countQuery.in("status", options.status)
        : countQuery.eq("status", options.status);
    }
    if (options.category_ids?.length) {
      countQuery = countQuery.in("category_id", options.category_ids);
    }
    if (options.location_ids?.length) {
      countQuery = countQuery.in("location_id", options.location_ids);
    }

    const { count: totalCount, error: countError } = await countQuery;
    if (countError) {
      throwRepositoryError("計算桌遊統計總筆數失敗", countError);
    }

    return buildPaginationResult<BoardGameDiscoveryItem>(
      [],
      totalCount,
      page,
      pageSize,
    );
  }

  return buildPaginationResult<BoardGameDiscoveryItem>(
    ((data ?? []) as unknown as BoardGameStatisticsRow[]).map(toBoardGameWithStats),
    count,
    page,
    pageSize,
  );
}

async function findRanked(
  ranking: BoardGameRanking,
  options: FindRankedBoardGamesOptions = {},
) {
  const { page, pageSize, from, to } = normalizePaginationOptions(options);
  const keyword = options.search?.trim();
  let query = supabase
    .from("board_game_rankings")
    .select("board_game_id,global_rank,name,image,status,inventory_number,completed_borrow_count,average_rating,rating_count,review_count,category_name,location_name,popularity_score", { count: "exact" })
    .eq("ranking", ranking);

  if (keyword) {
    query = query.ilike("name", buildIlikePattern(keyword));
  }

  const { data, error, count } = await query
    .order("global_rank", { ascending: true })
    .range(from, to);

  if (error) {
    if (!isPostgrestRangeNotSatisfiable(error)) {
      throwRepositoryError("取得公開桌遊排行榜失敗", error);
    }

    let countQuery = supabase
      .from("board_game_rankings")
      .select("board_game_id", { count: "exact", head: true })
      .eq("ranking", ranking);
    if (keyword) {
      countQuery = countQuery.ilike("name", buildIlikePattern(keyword));
    }
    const { count: totalCount, error: countError } = await countQuery;
    if (countError) throwRepositoryError("計算公開桌遊排行榜筆數失敗", countError);
    return buildPaginationResult<BoardGameRankingItem>([], totalCount, page, pageSize);
  }

  return buildPaginationResult<BoardGameRankingItem>(
    ((data ?? []) as unknown as BoardGameRankingRow[]).map(toBoardGameRankingItem),
    count,
    page,
    pageSize,
  );
}

export const boardGameStatisticsRepository = {
  findMany: findManyWithStats,
  findRanked,

  /** 熱門排序由 view 決定；關聯名稱在同一請求取得，首頁不計 pagination total。 */
  findPopular: async ({ limit = 6 }: { limit?: number } = {}): Promise<HomeBoardGameItem[]> => {
    const { data, error } = await supabase
      .from("board_game_popularity_statistics")
      .select("id:board_game_id,name,image,status,inventory_number,completed_borrow_count,average_rating,rating_count,review_count,category:board_game_categories(name),location:board_game_locations(name)")
      .order("popularity_score", { ascending: false })
      .order("rating_count", { ascending: false })
      .order("completed_borrow_count", { ascending: false })
      .order("average_rating", { ascending: false, nullsFirst: false })
      .order("board_game_id", { ascending: true })
      .limit(Math.min(100, Math.max(1, limit)));
    if (error) throwRepositoryError("讀取首頁熱門桌遊失敗", error);
    return ((data ?? []) as unknown as HomeBoardGameStatisticsRow[]).map(toHomeBoardGameWithStats);
  },
};

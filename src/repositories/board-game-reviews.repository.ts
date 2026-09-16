import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { buildPaginationResult, normalizePaginationOptions } from "@/repositories/shared/pagination";
import type { BoardGameReview } from "@/types/database";
import type { PublicIdentitySource } from "@/services/users/public-identity";
import type { ReviewSort } from "@/services/reviews/reviews.types";
import { buildIlikeSearch } from "@/repositories/shared/search";

const REVIEW_FIELDS = "id,board_game_id,user_id,rating,content,created_at,updated_at";
const PUBLIC_REVIEW_FIELDS = `${REVIEW_FIELDS},author:users!board_game_reviews_user_id_fkey(id,name,avatar,closed_at)`;

export type ReviewWriteInput = Pick<BoardGameReview, "rating" | "content">;
export type PublicReviewSource = BoardGameReview & { author: PublicIdentitySource };
export type ReviewAggregateSource = {
  average_rating: number | string | null;
  rating_count: number | string;
  review_count: number | string;
};
export type PublicProfileReviewSource = BoardGameReview & {
  board_game: { id: string; name: string };
};
function ownedReviewQuery(boardGameId: string, userId: string) {
  return supabase
    .from("board_game_reviews")
    .select(REVIEW_FIELDS)
    .eq("board_game_id", boardGameId)
    .eq("user_id", userId);
}

export const boardGameReviewsRepository = {
  create: async (boardGameId: string, userId: string, input: ReviewWriteInput): Promise<BoardGameReview> => {
    const { data, error } = await supabase
      .from("board_game_reviews")
      .insert({ board_game_id: boardGameId, user_id: userId, ...input })
      .select(REVIEW_FIELDS)
      .single();
    if (error) throwRepositoryError("建立桌遊評論失敗", error);
    return data;
  },

  findByBoardGameAndUser: async (boardGameId: string, userId: string): Promise<BoardGameReview | null> => {
    const { data, error } = await ownedReviewQuery(boardGameId, userId).maybeSingle();
    if (error) throwRepositoryError("取得使用者桌遊評論失敗", error);
    return data;
  },

  findPublicPage: async (boardGameId: string, options: { page: number; pageSize: number; search?: string; rating?: number; sort: ReviewSort }) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({ ...options, maxPageSize: 50 });
    let query = supabase
      .from("board_game_reviews")
      .select(PUBLIC_REVIEW_FIELDS, { count: "exact" })
      .eq("board_game_id", boardGameId);

    if (options.search) query = query.or(buildIlikeSearch(["content"], options.search));
    if (options.rating) query = query.eq("rating", options.rating);
    if (options.sort === "highest" || options.sort === "lowest") {
      query = query.order("rating", { ascending: options.sort === "lowest" });
    }
    const ascending = options.sort === "oldest";
    query = query.order("created_at", { ascending }).order("id", { ascending }).range(from, to);

    const { data, error, count } = await query;
    if (error) throwRepositoryError("取得公開桌遊評論失敗", error);
    return buildPaginationResult((data ?? []) as unknown as PublicReviewSource[], count, page, pageSize);
  },

  findPublicPageByUser: async (userId: string, options: { page: number; pageSize: number; search?: string; rating?: number; sort?: ReviewSort }) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({ ...options, maxPageSize: 12 });
    let matchingBoardGameIds: string[] = [];
    if (options.search) {
      const { data: boardGames, error: boardGameError } = await supabase
        .from("board_games")
        .select("id")
        .or(buildIlikeSearch(["name"], options.search));
      if (boardGameError) throwRepositoryError("搜尋個人評論桌遊失敗", boardGameError);
      matchingBoardGameIds = (boardGames ?? []).map((boardGame) => boardGame.id);
    }

    let query = supabase
      .from("board_game_reviews")
      .select(`${REVIEW_FIELDS},board_game:board_games!board_game_reviews_board_game_id_fkey(id,name)`, { count: "exact" })
      .eq("user_id", userId);

    if (options.search) {
      const conditions = [
        buildIlikeSearch(["content"], options.search),
        matchingBoardGameIds.length ? `board_game_id.in.(${matchingBoardGameIds.join(",")})` : "",
      ].filter(Boolean);
      query = query.or(conditions.join(","));
    }
    if (options.rating) query = query.eq("rating", options.rating);

    const sort = options.sort ?? "newest";
    if (sort === "highest" || sort === "lowest") {
      query = query.order("rating", { ascending: sort === "lowest" });
    }
    const ascending = sort === "oldest";
    const { data, error, count } = await query
      .order("created_at", { ascending })
      .order("id", { ascending })
      .range(from, to);
    if (error) throwRepositoryError("查詢公開個人頁評論失敗", error);
    return buildPaginationResult((data ?? []) as unknown as PublicProfileReviewSource[], count, page, pageSize);
  },

  findAggregate: async (boardGameId: string): Promise<ReviewAggregateSource | null> => {
    const { data, error } = await supabase
      .from("board_game_review_statistics")
      .select("average_rating,rating_count,review_count")
      .eq("board_game_id", boardGameId)
      .maybeSingle();
    if (error) throwRepositoryError("取得桌遊評分統計失敗", error);
    return data;
  },

  updateOwn: async (boardGameId: string, userId: string, input: Partial<ReviewWriteInput>): Promise<BoardGameReview | null> => {
    const { data, error } = await supabase
      .from("board_game_reviews")
      .update(input)
      .eq("board_game_id", boardGameId)
      .eq("user_id", userId)
      .select(REVIEW_FIELDS)
      .maybeSingle();
    if (error) throwRepositoryError("更新自己的桌遊評論失敗", error);
    return data;
  },

  deleteOwn: async (boardGameId: string, userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("board_game_reviews")
      .delete()
      .eq("board_game_id", boardGameId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error) throwRepositoryError("刪除自己的桌遊評論失敗", error);
    return data !== null;
  },
};

import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { buildPaginationResult, normalizePaginationOptions } from "@/repositories/shared/pagination";
import type { BoardGameReview } from "@/types/database";
import type { PublicIdentitySource } from "@/services/users/public-identity";
import type { ReviewSort } from "@/services/reviews/reviews.types";
import { buildIlikePattern, buildIlikeSearch } from "@/repositories/shared/search";

const REVIEW_FIELDS = "id,board_game_id,user_id,rating,content,created_at,updated_at";

export type ReviewWriteInput = Pick<BoardGameReview, "rating" | "content">;
export type PublicReviewWithLikesSource = Omit<BoardGameReview, "board_game_id" | "user_id"> & {
  author: PublicIdentitySource;
  like_count: number | string;
  liked_by_me: boolean;
};
export type ReviewLikeSource = { review_id: string; like_count: number | string; liked_by_me: boolean };
export type PublicReviewRankingSource = {
  global_rank: number | string;
  review_id: string;
  board_game_id: string;
  board_game_name: string;
  rating: number;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  author_closed_at: string | null;
  like_count: number | string;
};
export type ReviewAggregateSource = {
  average_rating: number | string | null;
  rating_count: number | string;
  review_count: number | string;
};
export type PublicProfileReviewSource = BoardGameReview & {
  board_game: { id: string; name: string };
};
export type FindAdminReviewsOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  rating?: number;
  boardGameId?: string;
  matchedUserIds?: string[];
  matchedBoardGameIds?: string[];
  sort?: ReviewSort;
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

  findPublicPage: async (boardGameId: string, options: { page: number; pageSize: number; search?: string; rating?: number; sort: ReviewSort; viewerUserId?: string }) => {
    const { page, pageSize, from } = normalizePaginationOptions({ ...options, maxPageSize: 50 });
    const { data, error } = await supabase.rpc("list_public_board_game_reviews", {
      p_board_game_id: boardGameId,
      p_viewer_user_id: options.viewerUserId ?? null,
      p_search: options.search ?? null,
      p_rating: options.rating ?? null,
      p_sort: options.sort,
      p_offset: from,
      p_limit: pageSize,
    });
    if (error) throwRepositoryError("取得公開桌遊評論失敗", error);
    const result = (data ?? { data: [], total: 0 }) as { data?: Array<{
      id: string; rating: number; content: string | null; created_at: string; updated_at: string;
      author_id: string; author_name: string; author_avatar: string | null; author_closed_at: string | null;
      like_count: number | string; liked_by_me: boolean;
    }>; total?: number | string };
    const records: PublicReviewWithLikesSource[] = (result.data ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      created_at: review.created_at,
      updated_at: review.updated_at,
      like_count: review.like_count,
      liked_by_me: review.liked_by_me,
      author: { id: review.author_id, name: review.author_name, avatar: review.author_avatar, closed_at: review.author_closed_at },
    }));
    return buildPaginationResult(records, Number(result.total ?? 0), page, pageSize);
  },

  findPopularRankings: async (options: { page?: number; pageSize?: number; search?: string } = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      ...options,
      maxPageSize: 50,
    });
    let query = supabase
      .from("board_game_review_rankings")
      .select("global_rank,review_id,board_game_id,board_game_name,rating,content,created_at,author_id,author_name,author_avatar,author_closed_at,like_count", { count: "exact" });
    if (options.search) query = query.ilike("content", buildIlikePattern(options.search));

    const { data, error, count } = await query
      .order("global_rank", { ascending: true })
      .range(from, to);
    if (error) throwRepositoryError("取得公開評論排行榜失敗", error);
    return buildPaginationResult(
      (data ?? []) as PublicReviewRankingSource[],
      count,
      page,
      pageSize,
    );
  },

  setLike: async (boardGameId: string, reviewId: string, userId: string, liked: boolean): Promise<ReviewLikeSource> => {
    const { data, error } = await supabase.rpc("set_board_game_review_like", {
      p_board_game_id: boardGameId,
      p_review_id: reviewId,
      p_user_id: userId,
      p_liked: liked,
    });
    if (error) throwRepositoryError("更新評論按讚狀態失敗", error);
    return data as ReviewLikeSource;
  },

  findPublicNewestPosition: async (boardGameId: string, reviewId: string): Promise<number | null> => {
    const { data: target, error: targetError } = await supabase
      .from("board_game_reviews")
      .select("id,created_at")
      .eq("board_game_id", boardGameId)
      .eq("id", reviewId)
      .maybeSingle();
    if (targetError) throwRepositoryError("查詢公開評論位置失敗", targetError);
    if (!target) return null;

    // 公開評論以建立時間與 UUID 倒序排列；計算相同排序下位於目標之前的筆數，才能穩定換算分頁。
    const { count, error: countError } = await supabase
      .from("board_game_reviews")
      .select("id", { count: "exact", head: true })
      .eq("board_game_id", boardGameId)
      .or(`created_at.gt.${target.created_at},and(created_at.eq.${target.created_at},id.gt.${target.id})`);
    if (countError) throwRepositoryError("計算公開評論位置失敗", countError);
    return count ?? 0;
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

  findAdminPage: async (options: FindAdminReviewsOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({
      page: options.page,
      pageSize: options.pageSize,
      maxPageSize: 100,
    });
    let query = supabase
      .from("board_game_reviews")
      .select(REVIEW_FIELDS, { count: "exact" });

    if (options.search) {
      const conditions = [
        buildIlikeSearch(["content"], options.search),
        options.matchedUserIds?.length
          ? `user_id.in.(${options.matchedUserIds.join(",")})`
          : "",
        options.matchedBoardGameIds?.length
          ? `board_game_id.in.(${options.matchedBoardGameIds.join(",")})`
          : "",
      ].filter(Boolean);
      query = query.or(conditions.join(","));
    }
    if (options.rating) query = query.eq("rating", options.rating);
    if (options.boardGameId) query = query.eq("board_game_id", options.boardGameId);

    const sort = options.sort ?? "newest";
    if (sort === "highest" || sort === "lowest") {
      query = query.order("rating", { ascending: sort === "lowest" });
    }
    const ascending = sort === "oldest";
    const { data, error, count } = await query
      .order("created_at", { ascending })
      .order("id", { ascending })
      .range(from, to);
    if (error) throwRepositoryError("取得管理端評價失敗", error);
    return buildPaginationResult(data ?? [], count, page, pageSize);
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

  deleteById: async (id: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("board_game_reviews")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throwRepositoryError("刪除管理端評價失敗", error);
    return data !== null;
  },
};

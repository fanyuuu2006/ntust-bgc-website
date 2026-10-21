import "server-only";

import { z } from "zod";
import { invalidatePublicDataSafely } from "@/libs/cache/public-data";
import { RepositoryError } from "@/repositories/shared/errors";
import { boardGameReviewsRepository } from "@/repositories/board-game-reviews.repository";
import { boardGamesRepository } from "@/repositories/board-games.repository";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { toPublicUserIdentity } from "@/services/users/public-identity";
import { createReviewSchema, listReviewsSchema, profileReviewsQuerySchema, replaceReviewSchema, setReviewLikeSchema } from "./reviews.schema";
import { DuplicateReviewError, ReviewNotFoundError } from "./reviews.errors";
import type { BoardGameReviewAggregate, PublicBoardGameReview, PublicBoardGameReviewsPage, PublicProfileReviewsPage, ReviewRating } from "./reviews.types";

type DatabaseError = { code?: string; constraint?: string; message?: string };

function databaseError(error: unknown): DatabaseError | null {
  return error instanceof RepositoryError && error.cause && typeof error.cause === "object"
    ? error.cause as DatabaseError
    : null;
}

function isConstraint(error: DatabaseError | null, code: string, constraint: string) {
  return error?.code === code && (error.constraint === constraint || error.message?.includes(`\"${constraint}\"`));
}

function rethrowCreateError(error: unknown): never {
  const source = databaseError(error);
  if (isConstraint(source, "23505", "board_game_reviews_user_game_key")) throw new DuplicateReviewError();
  if (isConstraint(source, "23503", "board_game_reviews_board_game_id_fkey")) throw new BoardNotFoundError();
  throw error;
}

async function requireBoardGame(boardGameId: unknown): Promise<string> {
  const id = z.uuid().parse(boardGameId);
  if (!await boardGamesRepository.findById(id)) throw new BoardNotFoundError();
  return id;
}

function toPublicReview(source: Awaited<ReturnType<typeof boardGameReviewsRepository.findPublicPage>>["data"][number]): PublicBoardGameReview {
  return {
    id: source.id,
    rating: source.rating as ReviewRating,
    content: source.content,
    createdAt: source.created_at,
    updatedAt: source.updated_at,
    likeCount: Number(source.like_count),
    likedByMe: source.liked_by_me,
    author: toPublicUserIdentity(source.author),
  };
}

function toProfileReview(review: Awaited<ReturnType<typeof boardGameReviewsRepository.findPublicPageByUser>>["data"][number]) {
  return {
    id: review.id,
    rating: review.rating as ReviewRating,
    content: review.content,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
    boardGame: { id: review.board_game.id, name: review.board_game.name },
  };
}

async function deleteReview(deleteOperation: () => Promise<boolean>) {
  if (!await deleteOperation()) throw new ReviewNotFoundError();
  invalidatePublicDataSafely("popularGames");
}

export const reviewsService = {
  create: async (userId: string, boardGameId: unknown, input: unknown) => {
    const id = await requireBoardGame(boardGameId);
    const payload = createReviewSchema.parse(input);
    const created = await boardGameReviewsRepository.create(id, userId, payload).catch(rethrowCreateError);
    invalidatePublicDataSafely("popularGames");
    return { rating: created.rating as ReviewRating, content: created.content };
  },

  findOwn: async (userId: string, boardGameId: unknown) => {
    const id = z.uuid().parse(boardGameId);
    const review = await boardGameReviewsRepository.findByBoardGameAndUser(id, userId);
    return review ? { rating: review.rating as ReviewRating, content: review.content } : null;
  },

  listPublic: async (boardGameId: unknown, input: unknown = {}, viewerUserId?: unknown): Promise<PublicBoardGameReviewsPage> => {
    const id = z.uuid().parse(boardGameId);
    const options = listReviewsSchema.parse(input);
    const viewerId = viewerUserId == null ? undefined : z.uuid().parse(viewerUserId);
    const result = await boardGameReviewsRepository.findPublicPage(id, { ...options, viewerUserId: viewerId });
    return { ...result, data: result.data.map(toPublicReview) };
  },

  setLike: async (userId: unknown, boardGameId: unknown, reviewId: unknown, input: unknown) => {
    const actorId = z.uuid().parse(userId);
    const gameId = z.uuid().parse(boardGameId);
    const id = z.uuid().parse(reviewId);
    const { liked } = setReviewLikeSchema.parse(input);
    try {
      const result = await boardGameReviewsRepository.setLike(gameId, id, actorId, liked);
      return { reviewId: result.review_id, likeCount: Number(result.like_count), likedByMe: result.liked_by_me };
    } catch (error) {
      const source = databaseError(error);
      if (source?.code === "P0002" && source.message?.includes("REVIEW_NOT_FOUND")) throw new ReviewNotFoundError();
      throw error;
    }
  },

  resolvePublicNewestLocation: async (boardGameId: unknown, reviewId: unknown, pageSize = 10) => {
    const gameId = z.uuid().parse(boardGameId);
    const id = z.uuid().parse(reviewId);
    const normalizedPageSize = z.number().int().min(1).max(50).parse(pageSize);
    const precedingCount = await boardGameReviewsRepository.findPublicNewestPosition(gameId, id);
    return precedingCount === null
      ? null
      : { reviewId: id, page: Math.floor(precedingCount / normalizedPageSize) + 1 };
  },

  listPublicByUser: async (userId: unknown, input: unknown = {}): Promise<PublicProfileReviewsPage> => {
    const id = z.uuid().parse(userId);
    const options = profileReviewsQuerySchema.parse(input);
    const result = await boardGameReviewsRepository.findPublicPageByUser(id, options);
    return {
      ...result,
      data: result.data.map(toProfileReview),
    };
  },

  getAggregate: async (boardGameId: unknown): Promise<BoardGameReviewAggregate> => {
    const id = z.uuid().parse(boardGameId);
    const aggregate = await boardGameReviewsRepository.findAggregate(id);
    return aggregate ? {
      averageRating: aggregate.average_rating === null ? null : Number(aggregate.average_rating),
      ratingCount: Number(aggregate.rating_count),
      reviewCount: Number(aggregate.review_count),
    } : { averageRating: null, ratingCount: 0, reviewCount: 0 };
  },

  updateOwn: async (userId: string, boardGameId: unknown, input: unknown) => {
    const id = z.uuid().parse(boardGameId);
    const updated = await boardGameReviewsRepository.updateOwn(id, userId, replaceReviewSchema.parse(input));
    if (!updated) throw new ReviewNotFoundError();
    invalidatePublicDataSafely("popularGames");
    return { rating: updated.rating as ReviewRating, content: updated.content };
  },

  deleteOwn: async (userId: string, boardGameId: unknown): Promise<void> => {
    const id = z.uuid().parse(boardGameId);
    await deleteReview(() => boardGameReviewsRepository.deleteOwn(id, userId));
  },

  deleteForAdmin: async (reviewId: unknown): Promise<void> => {
    const id = z.uuid().parse(reviewId);
    await deleteReview(() => boardGameReviewsRepository.deleteById(id));
  },
};

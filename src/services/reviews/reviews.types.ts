import type { PublicUserIdentity } from "@/types/public-user";

export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ReviewSort = "popular" | "newest" | "oldest" | "highest" | "lowest";
export type ReviewListQuery = Readonly<{
  page: number;
  pageSize: number;
  search?: string;
  rating?: ReviewRating;
  sort: ReviewSort;
}>;

export type PublicBoardGameReview = Readonly<{
  id: string;
  rating: ReviewRating;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByMe: boolean;
  author: PublicUserIdentity;
}>;

export type ReviewLikeResult = Readonly<{
  reviewId: string;
  likeCount: number;
  likedByMe: boolean;
}>;
export type BoardGameReviewAggregate = Readonly<{
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
}>;

export type PublicBoardGameReviewsPage = Readonly<{
  data: PublicBoardGameReview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type PublicReviewRankingItem = Readonly<{
  globalRank: number;
  id: string;
  boardGame: Readonly<{ id: string; name: string }>;
  rating: ReviewRating;
  content: string;
  createdAt: string;
  likeCount: number;
  author: PublicUserIdentity;
}>;

export type PublicReviewRankingsPage = Readonly<{
  data: PublicReviewRankingItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type PublicProfileReview = Readonly<{
  id: string;
  rating: ReviewRating;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  boardGame: Readonly<{ id: string; name: string }>;
}>;

export type PublicProfileReviewsPage = Readonly<{
  data: PublicProfileReview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

import type { PublicUserIdentity } from "@/types/public-user";

export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ReviewSort = "newest" | "oldest" | "highest" | "lowest";

export type PublicBoardGameReview = Readonly<{
  id: string;
  rating: ReviewRating;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  author: PublicUserIdentity;
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

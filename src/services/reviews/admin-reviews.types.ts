import type { ReviewRating } from "./reviews.types";

export type AdminReview = Readonly<{
  id: string;
  rating: ReviewRating;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    closed_at: string | null;
    real_name: string | null;
    student_id: string | null;
  };
  boardGame: Readonly<{ id: string; name: string }>;
}>;

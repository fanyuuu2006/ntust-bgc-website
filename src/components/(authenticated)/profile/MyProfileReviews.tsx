import { ReviewAuthorAction } from "@/components/(public)/board-games/ReviewAuthorAction";
import { ProfileReviewCollection } from "@/components/(public)/profile/ProfileReviewCollection";
import type { ReviewListQuery, PublicProfileReviewsPage } from "@/services/reviews/reviews.types";

const BASE_PATH = "/profile";
export function MyProfileReviews({ reviews, query, canManage }: {
  reviews: PublicProfileReviewsPage;
  query: ReviewListQuery;
  canManage: boolean;
}) {
  return (
    <ProfileReviewCollection basePath={BASE_PATH} reviews={reviews} query={query} own renderActions={canManage ? (review) => (
            <ReviewAuthorAction boardGameId={review.boardGame.id} eligibility="verified" ownReview={{ rating: review.rating, content: review.content }} actionsOnly />
          ) : undefined} />
  );
}

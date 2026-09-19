import Link from "next/link";
import type { ReactNode } from "react";

import { RatingStars } from "@/components/(public)/board-games/RatingStars";
import type { PublicProfileReviewsPage } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";
import { wasReviewMeaningfullyEdited } from "@/utils/review-presentation";
import { buildBoardGameDetailHref } from "@/libs/board-game-return";

export function ProfileReviewItems({ reviews, renderActions, returnTo }: {
  reviews: PublicProfileReviewsPage;
  renderActions?: (review: PublicProfileReviewsPage["data"][number]) => ReactNode;
  returnTo?: string;
}) {
  return (
    <div className="mt-4 divide-y divide-(--border-muted)">
      {reviews.data.map((review) => (
        <article key={review.id} className={renderActions ? "relative min-w-0 py-4 pr-12 first:pt-0 last:pb-0" : "min-w-0 py-4 first:pt-0 last:pb-0"}>
          <Link href={returnTo ? buildBoardGameDetailHref(review.boardGame.id, returnTo) : `/board-games/${review.boardGame.id}`} className="wrap-anywhere font-semibold text-(--interactive-primary) hover:underline">
            {review.boardGame.name}
          </Link>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-muted)">
            <RatingStars rating={review.rating} size="sm" label={`評分 ${review.rating} 分`} />
            <span aria-hidden="true">·</span>
            <time dateTime={review.createdAt}>{formatDateTime(review.createdAt)}</time>
            {wasReviewMeaningfullyEdited(review.createdAt, review.updatedAt) ? <span>已編輯</span> : null}
          </div>
          {review.content === null ? null : (
            <p className="mt-3 whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-(--text-secondary)">{review.content}</p>
          )}
          {renderActions?.(review)}
        </article>
      ))}
    </div>
  );
}

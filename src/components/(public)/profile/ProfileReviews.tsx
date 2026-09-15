import Link from "next/link";

import { RatingStars } from "@/components/(public)/board-games/RatingStars";
import { Card } from "@/components/ui/Card";
import type { PublicProfileReviewsPage } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";
import { wasReviewMeaningfullyEdited } from "@/utils/review-presentation";
import { buildQueryString } from "@/utils/url";

export function ProfileReviews({ userId, reviews }: { userId: string; reviews: PublicProfileReviewsPage }) {
  const basePath = `/profile/${userId}`;
  const hrefForPage = (page: number) => `${basePath}?${buildQueryString({ reviewPage: page })}#profile-reviews`;

  return (
    <section id="profile-reviews" aria-labelledby="profile-reviews-title">
      <Card className="p-4 sm:p-5">
        <h2 id="profile-reviews-title" className="text-lg font-bold text-(--text-primary)">桌遊評分與評論</h2>
        {reviews.total === 0 ? (
          <p className="mt-3 text-sm text-(--text-muted)">尚未留下桌遊評分</p>
        ) : (
          <div className="mt-4 divide-y divide-(--border-muted)">
            {reviews.data.map((review) => (
              <article key={review.id} className="min-w-0 py-4 first:pt-0 last:pb-0">
                <Link href={`/board-games/${review.boardGame.id}`} className="wrap-anywhere font-semibold text-(--interactive-primary) hover:underline">
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
              </article>
            ))}
          </div>
        )}
        {reviews.totalPages > 1 ? (
          <nav aria-label="個人評論分頁" className="mt-4 flex min-h-11 items-center justify-between gap-3 border-t border-(--border-muted) pt-4 text-sm">
            {reviews.page > 1 ? <Link className="btn inline-flex min-h-11 items-center rounded-md px-3" href={hrefForPage(reviews.page - 1)}>上一頁</Link> : <span aria-disabled="true" className="btn inline-flex min-h-11 items-center rounded-md px-3 opacity-50">上一頁</span>}
            <span className="text-(--text-muted)">第 {reviews.page} / {reviews.totalPages} 頁</span>
            {reviews.page < reviews.totalPages ? <Link className="btn inline-flex min-h-11 items-center rounded-md px-3" href={hrefForPage(reviews.page + 1)}>下一頁</Link> : <span aria-disabled="true" className="btn inline-flex min-h-11 items-center rounded-md px-3 opacity-50">下一頁</span>}
          </nav>
        ) : null}
      </Card>
    </section>
  );
}

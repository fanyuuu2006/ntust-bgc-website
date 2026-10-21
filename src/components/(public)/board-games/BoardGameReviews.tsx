import { PublicUserLink } from "@/components/PublicUserLink";
import { hasReviewCriteria, ReviewQueryControls, ReviewResultSummary, reviewAppliedQuery, reviewQueryHref } from "@/components/(public)/reviews/ReviewQueryControls";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import type { BoardGameReviewAggregate, PublicBoardGameReviewsPage, ReviewListQuery } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";
import { wasReviewMeaningfullyEdited } from "@/utils/review-presentation";
import { formatAverageRating, RatingStars } from "./RatingStars";
import { ReviewLikeButton } from "./ReviewLikeButton";

export function BoardGameReviews({ boardGameId, aggregate, reviews, query: suppliedQuery, sort, authorAction, returnTo, targetReviewId, targetUnavailable = false, likeEligibility = "anonymous" }: {
  boardGameId: string;
  aggregate: BoardGameReviewAggregate;
  reviews: PublicBoardGameReviewsPage;
  query?: ReviewListQuery;
  /** @deprecated Compatibility for existing presentation callers; routes pass the normalized query. */
  sort?: ReviewListQuery["sort"];
  authorAction?: React.ReactNode;
  returnTo?: string;
  targetReviewId?: string;
  targetUnavailable?: boolean;
  likeEligibility?: "anonymous" | "unverified" | "verified" | "unavailable";
}) {
  const query: ReviewListQuery = suppliedQuery ?? { page: reviews.page, pageSize: reviews.pageSize, sort: sort ?? "popular" };
  const basePath = `/board-games/${boardGameId}`;
  const preservedQuery = { returnTo };
  const appliedQuery = reviewAppliedQuery(query, preservedQuery);
  const filtered = hasReviewCriteria(query);
  const resetHref = reviewQueryHref(basePath, { ...preservedQuery, reviewSort: query.sort === "popular" ? undefined : query.sort }, "board-game-reviews");

  return (
    <section id="board-game-reviews" className="mt-8 max-w-4xl border-t border-(--border-muted) pt-6" aria-labelledby="board-game-reviews-title">
      <div className="min-w-0">
        <h2 id="board-game-reviews-title" className="text-xl font-semibold text-(--text-primary)">評分與評論</h2>
        {aggregate.averageRating === null ? <p className="mt-2 text-sm text-(--text-muted)">尚無評分</p> : (
          <div className="mt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <strong className="text-3xl font-semibold leading-none tabular-nums text-(--text-primary)">{formatAverageRating(aggregate.averageRating)}</strong>
              <RatingStars rating={aggregate.averageRating} size="lg" label={`平均評分 ${formatAverageRating(aggregate.averageRating)}，滿分 5 分`} />
            </div>
            <p className="mt-2 text-sm text-(--text-muted)">{aggregate.ratingCount.toLocaleString("zh-TW")} 人評分<span aria-hidden="true"> · </span>{aggregate.reviewCount.toLocaleString("zh-TW")} 則文字評論</p>
          </div>
        )}
      </div>

      {authorAction}

      <section className="mt-9" aria-labelledby="public-reviews-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="public-reviews-title" className="font-semibold text-(--text-primary)">公開評價</h3>
        </div>
        <ReviewQueryControls basePath={basePath} query={query} searchPlaceholder="搜尋評論內容" searchLabel="搜尋這款桌遊的評論" preservedQuery={preservedQuery} anchor="board-game-reviews" includePopular defaultSort="popular" />
      </section>

      <PaginatedCollection
        className="mt-5"
        page={reviews.page}
        pageSize={reviews.pageSize}
        total={reviews.total}
        totalPages={reviews.totalPages}
        basePath={basePath}
        query={appliedQuery}
        pageKey="reviewPage"
        showPageSize={false}
        aria-label="評論分頁"
        summary={<ReviewResultSummary total={reviews.total} filtered={filtered} />}
      >
        {targetUnavailable ? (
          <p role="status" className="mb-4 rounded-xl border border-(--border-default) bg-(--surface-subtle) px-4 py-3 text-sm text-(--text-muted)">
            找不到可公開的指定評論
          </p>
        ) : null}
        {reviews.total === 0 ? (
          filtered ? <QueryEmptyState title="找不到符合條件的評價" description="試著調整搜尋或評分條件。" clearHref={resetHref} />
            : <p className="py-2 text-sm text-(--text-muted)">目前還沒有評分</p>
        ) : (
          <div className="divide-y divide-(--border-muted)">
          {reviews.data.map((review) => (
            <article
              key={review.id}
              id={`review-${review.id}`}
              className="min-w-0 scroll-mt-24 rounded-xl py-5 transition-colors first:pt-4 last:pb-4 target:bg-(--surface-subtle) target:px-4"
              aria-current={review.id === targetReviewId ? "true" : undefined}
            >
              <header className="min-w-0">
                <PublicUserLink identity={review.author} />
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-muted)">
                  <RatingStars rating={review.rating} size="sm" label={`評分 ${review.rating} 分`} />
                  <span aria-hidden="true">·</span>
                  <time dateTime={review.createdAt}>{formatDateTime(review.createdAt)}</time>
                  {wasReviewMeaningfullyEdited(review.createdAt, review.updatedAt) ? <span>已編輯</span> : null}
                </div>
              </header>
              {review.content === null ? null : <p className="mt-3 max-w-3xl whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-(--text-secondary)">{review.content}</p>}
              <ReviewLikeButton
                boardGameId={boardGameId}
                reviewId={review.id}
                initialLikeCount={review.likeCount ?? 0}
                initialLikedByMe={review.likedByMe ?? false}
                eligibility={likeEligibility}
              />
            </article>
          ))}
          </div>
        )}

      </PaginatedCollection>
    </section>
  );
}

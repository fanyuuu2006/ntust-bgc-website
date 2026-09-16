import { PublicUserLink } from "@/components/PublicUserLink";
import { hasReviewCriteria, ReviewQueryControls, ReviewResultSummary, reviewAppliedQuery, reviewQueryHref } from "@/components/(public)/reviews/ReviewQueryControls";
import { Pagination } from "@/components/Pagination/Pagination";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import type { BoardGameReviewAggregate, PublicBoardGameReviewsPage, ReviewListQuery } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";
import { wasReviewMeaningfullyEdited } from "@/utils/review-presentation";
import { formatAverageRating, RatingStars } from "./RatingStars";

export function BoardGameReviews({ boardGameId, aggregate, reviews, query: suppliedQuery, sort, authorAction, returnTo }: {
  boardGameId: string;
  aggregate: BoardGameReviewAggregate;
  reviews: PublicBoardGameReviewsPage;
  query?: ReviewListQuery;
  /** @deprecated Compatibility for existing presentation callers; routes pass the normalized query. */
  sort?: ReviewListQuery["sort"];
  authorAction?: React.ReactNode;
  returnTo?: string;
}) {
  const query: ReviewListQuery = suppliedQuery ?? { page: reviews.page, pageSize: reviews.pageSize, sort: sort ?? "newest" };
  const basePath = `/board-games/${boardGameId}`;
  const preservedQuery = { returnTo };
  const appliedQuery = reviewAppliedQuery(query, preservedQuery);
  const filtered = hasReviewCriteria(query);
  const resetHref = reviewQueryHref(basePath, { ...preservedQuery, reviewSort: query.sort === "newest" ? undefined : query.sort }, "board-game-reviews");

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

      <div className="mt-6 border-t border-(--border-muted) pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-(--text-primary)">公開評價</h3>
          <ReviewResultSummary total={reviews.total} filtered={filtered} />
        </div>
        <ReviewQueryControls basePath={basePath} query={query} searchPlaceholder="搜尋評論內容" searchLabel="搜尋這款桌遊的評論" preservedQuery={preservedQuery} anchor="board-game-reviews" />
      </div>

      {reviews.total === 0 ? (
        filtered ? <QueryEmptyState className="mt-5" title="找不到符合條件的評價" description="試著調整搜尋或評分條件。" clearHref={resetHref} />
          : <p className="mt-5 border-y border-(--border-muted) py-5 text-sm text-(--text-muted)">目前還沒有評分</p>
      ) : (
        <div className="mt-5 divide-y divide-(--border-muted) border-y border-(--border-muted)">
          {reviews.data.map((review) => (
            <article key={review.id} className="min-w-0 py-5 first:pt-4 last:pb-4">
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
            </article>
          ))}
        </div>
      )}

      <Pagination aria-label="評論分頁" page={reviews.page} pageSize={reviews.pageSize} total={reviews.total} totalPages={reviews.totalPages} basePath={basePath} query={appliedQuery} pageKey="reviewPage" showPageSize={false} className="mt-5" />
    </section>
  );
}

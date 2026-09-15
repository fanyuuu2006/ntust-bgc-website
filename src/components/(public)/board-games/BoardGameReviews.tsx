import Link from "next/link";

import { PublicUserLink } from "@/components/PublicUserLink";
import { Button } from "@/components/ui/Button";
import type { BoardGameReviewAggregate, PublicBoardGameReviewsPage, ReviewSort } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";
import { buildQueryString } from "@/utils/url";
import { formatAverageRating, RatingStars } from "./RatingStars";

const SORT_OPTIONS: ReadonlyArray<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "最新評論" },
  { value: "oldest", label: "最早評論" },
  { value: "highest", label: "評分最高" },
  { value: "lowest", label: "評分最低" },
];

function wasMeaningfullyEdited(createdAt: string, updatedAt: string) {
  const difference = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  return Number.isFinite(difference) && difference >= 1_000;
}

export function BoardGameReviews({ boardGameId, aggregate, reviews, sort, authorAction }: {
  boardGameId: string;
  aggregate: BoardGameReviewAggregate;
  reviews: PublicBoardGameReviewsPage;
  sort: ReviewSort;
  authorAction?: React.ReactNode;
}) {
  const basePath = `/board-games/${boardGameId}`;
  const pageHref = (page: number) => `${basePath}?${buildQueryString({ reviewPage: page, reviewSort: sort === "newest" ? undefined : sort })}#board-game-reviews`;

  return (
    <section className="mt-8 max-w-4xl border-t border-(--border-muted) pt-6" aria-labelledby="board-game-reviews">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="board-game-reviews" className="text-xl font-semibold text-(--text-primary)">評分與評論</h2>
          {aggregate.averageRating === null ? <p className="mt-2 text-sm text-(--text-muted)">尚無評分</p> : (
            <div className="mt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <strong className="text-3xl font-semibold leading-none tabular-nums text-(--text-primary)">{formatAverageRating(aggregate.averageRating)}</strong>
                <RatingStars rating={aggregate.averageRating} size="lg" label={`平均評分 ${formatAverageRating(aggregate.averageRating)}，滿分 5 分`} />
              </div>
              <p className="mt-2 text-sm text-(--text-muted)">
                {aggregate.ratingCount.toLocaleString("zh-TW")} 人評分<span aria-hidden="true"> · </span>{aggregate.reviewCount.toLocaleString("zh-TW")} 則文字評論
              </p>
            </div>
          )}
        </div>
        {reviews.total > 1 ? (
          <form action={basePath} method="get" className="flex min-h-11 min-w-0 flex-wrap items-center gap-2">
            <label htmlFor="review-sort" className="shrink-0 text-sm text-(--text-muted)">排序</label>
            <select id="review-sort" name="reviewSort" defaultValue={sort} className="min-h-10 min-w-0 rounded-md border border-(--border-default) bg-(--surface-default) px-3 text-sm">
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm" className="min-h-11">套用</Button>
          </form>
        ) : null}
      </div>

      {authorAction}

      {reviews.total === 0 ? <p className="mt-6 border-y border-(--border-muted) py-5 text-sm text-(--text-muted)">目前還沒有評分</p> : (
        <div className="mt-6 divide-y divide-(--border-muted) border-y border-(--border-muted)">
          {reviews.data.map((review) => (
            <article key={review.id} className="min-w-0 py-5 first:pt-4 last:pb-4">
              <header className="min-w-0">
                <PublicUserLink identity={review.author} />
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-muted)">
                  <RatingStars rating={review.rating} size="sm" label={`評分 ${review.rating} 分`} />
                  <span aria-hidden="true">·</span>
                  <time dateTime={review.createdAt}>{formatDateTime(review.createdAt)}</time>
                  {wasMeaningfullyEdited(review.createdAt, review.updatedAt) ? <span>已編輯</span> : null}
                </div>
              </header>
              {review.content === null ? null : (
                <p className="mt-3 max-w-3xl whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-(--text-secondary)">{review.content}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {reviews.totalPages > 1 ? (
        <nav aria-label="評論分頁" className="mt-4 flex min-h-11 items-center justify-between gap-3 text-sm">
          {reviews.page > 1 ? <Link className="btn inline-flex min-h-11 items-center rounded-md px-3" href={pageHref(reviews.page - 1)}>上一頁</Link> : <span aria-disabled="true" className="btn inline-flex min-h-11 items-center rounded-md px-3 opacity-50">上一頁</span>}
          <span className="text-(--text-muted)">第 {reviews.page} / {reviews.totalPages} 頁</span>
          {reviews.page < reviews.totalPages ? <Link className="btn inline-flex min-h-11 items-center rounded-md px-3" href={pageHref(reviews.page + 1)}>下一頁</Link> : <span aria-disabled="true" className="btn inline-flex min-h-11 items-center rounded-md px-3 opacity-50">下一頁</span>}
        </nav>
      ) : null}
    </section>
  );
}

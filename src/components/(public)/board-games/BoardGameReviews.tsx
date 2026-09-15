import Link from "next/link";

import { PublicUserLink } from "@/components/PublicUserLink";
import { Button } from "@/components/ui/Button";
import type { BoardGameReviewAggregate, PublicBoardGameReviewsPage, ReviewSort } from "@/services/reviews/reviews.types";
import { formatDateTime } from "@/utils/date";
import { buildQueryString } from "@/utils/url";
import { RatingDisplay } from "./RatingDisplay";

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

export function BoardGameReviews({
  boardGameId,
  aggregate,
  reviews,
  sort,
}: {
  boardGameId: string;
  aggregate: BoardGameReviewAggregate;
  reviews: PublicBoardGameReviewsPage;
  sort: ReviewSort;
}) {
  const basePath = `/board-games/${boardGameId}`;
  const pageHref = (page: number) => `${basePath}?${buildQueryString({ reviewPage: page, reviewSort: sort === "newest" ? undefined : sort })}#board-game-reviews`;

  return (
    <section className="mt-8 max-w-4xl border-t border-(--border-muted) pt-6" aria-labelledby="board-game-reviews">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="board-game-reviews" className="text-xl font-semibold text-(--text-primary)">評分與評論</h2>
          {aggregate.averageRating === null ? (
            <p className="mt-2 text-sm text-(--text-muted)">尚無評分</p>
          ) : (
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--text-muted)">
              <RatingDisplay rating={Number(aggregate.averageRating.toFixed(1))} label={`平均評分 ${aggregate.averageRating.toFixed(1)} / 5`} />
              <span>{aggregate.ratingCount} 人評分</span>
              <span>{aggregate.reviewCount} 則評論</span>
            </div>
          )}
        </div>

        {aggregate.reviewCount > 1 ? (
          <form action={basePath} method="get" className="flex min-h-11 items-center gap-2">
            <label htmlFor="review-sort" className="shrink-0 text-sm text-(--text-muted)">排序</label>
            <select id="review-sort" name="reviewSort" defaultValue={sort} className="min-h-10 rounded-md border border-(--border-default) bg-(--surface-default) px-3 text-sm">
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm" className="min-h-11">套用</Button>
          </form>
        ) : null}
      </div>

      {reviews.total === 0 ? (
        <p className="mt-5 rounded-xl border border-(--border-default) bg-(--surface-subtle) p-4 text-sm text-(--text-muted)">目前還沒有文字評論</p>
      ) : (
        <div className="mt-5 divide-y divide-(--border-muted) border-y border-(--border-muted)">
          {reviews.data.map((review) => (
            <article key={review.id} className="min-w-0 py-4 first:pt-3 last:pb-3">
              <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <PublicUserLink identity={review.author} />
                <RatingDisplay rating={review.rating} />
              </header>
              <p className="mt-3 whitespace-pre-wrap wrap-anywhere text-sm leading-6 text-(--text-secondary)">{review.content}</p>
              <p className="mt-2 text-xs text-(--text-muted)">
                <time dateTime={review.createdAt}>{formatDateTime(review.createdAt)}</time>
                {wasMeaningfullyEdited(review.createdAt, review.updatedAt) ? " · 已編輯" : null}
              </p>
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

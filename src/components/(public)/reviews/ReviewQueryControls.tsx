import { ArrowUpDown } from "lucide-react";

import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { ReviewListQuery } from "@/services/reviews/reviews.types";
import { buildQueryString, type QueryValue } from "@/utils/url";

const SORT_OPTIONS = [
  { value: "newest", label: "最新評論" },
  { value: "oldest", label: "最舊評論" },
  { value: "highest", label: "評分最高" },
  { value: "lowest", label: "評分最低" },
] as const;

export function ReviewQueryControls({ basePath, query, searchPlaceholder, searchLabel, preservedQuery = {}, anchor = "profile-reviews" }: {
  basePath: string;
  query: ReviewListQuery;
  searchPlaceholder: string;
  searchLabel: string;
  preservedQuery?: Record<string, QueryValue>;
  anchor?: string;
}) {
  const appliedQuery = reviewAppliedQuery(query, preservedQuery);
  const clearSearchHref = reviewQueryHref(basePath, {
    ...preservedQuery,
    reviewRating: query.rating,
    reviewSort: query.sort === "newest" ? undefined : query.sort,
  }, anchor);
  const resetHref = reviewQueryHref(basePath, {
    ...preservedQuery,
    reviewSort: query.sort === "newest" ? undefined : query.sort,
  }, anchor);
  const hasQuery = hasReviewQuery(query);

  return (
    <div className="mt-4">
      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <form method="GET" action={basePath} aria-label={searchLabel} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input type="hidden" name="reviewPage" value="1" />
          {Object.entries(preservedQuery).map(([name, value]) => value == null ? null : <input key={name} type="hidden" name={name} value={String(value)} />)}
          {query.rating ? <input type="hidden" name="reviewRating" value={query.rating} /> : null}
          {query.sort !== "newest" ? <input type="hidden" name="reviewSort" value={query.sort} /> : null}
          <ClearableSearchInput name="reviewSearch" initialValue={query.search} clearHref={clearSearchHref} placeholder={searchPlaceholder} aria-label={searchLabel} inputClassName="text-base lg:text-sm" />
          <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
        </form>

        <ImmediateQuerySelect aria-label="評分篩選" appliedQuery={appliedQuery} basePath={basePath} queryKey="reviewRating" pageKey="reviewPage" value={query.rating ? String(query.rating) : ""} className="w-full lg:w-32">
          <option value="">全部評分</option>
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} 星</option>)}
        </ImmediateQuerySelect>

        <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-within:border-(--interactive-primary) focus-within:outline-2 focus-within:outline-(--focus-ring) lg:min-w-36">
          <ArrowUpDown aria-hidden="true" className="size-4 shrink-0 text-(--text-muted)" />
          <span className="sr-only">排序</span>
          <ImmediateQuerySelect appliedQuery={appliedQuery} basePath={basePath} queryKey="reviewSort" pageKey="reviewPage" value={query.sort} focusOwner="parent" className="min-h-0 min-w-0 border-0 bg-transparent px-0 py-0">
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </ImmediateQuerySelect>
        </label>
      </div>

      {hasQuery ? (
        <div className="mt-2 flex items-center gap-3 text-sm text-(--text-muted)">
          <p>已套用查詢條件</p>
          <ButtonLink href={resetHref} variant="text" size="sm" className="min-h-0 px-0">清除條件</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

export function ReviewResultSummary({ total, filtered }: { total: number; filtered: boolean }) {
  return <p aria-live="polite" className="text-sm tabular-nums text-(--text-muted)">{filtered ? `找到 ${total} 筆評價` : `共 ${total} 筆評價`}</p>;
}

export function hasReviewCriteria(query: ReviewListQuery) {
  return Boolean(query.search || query.rating);
}

export function hasReviewQuery(query: ReviewListQuery) {
  return Boolean(hasReviewCriteria(query) || query.sort !== "newest");
}

export function reviewAppliedQuery(query: ReviewListQuery, preservedQuery: Record<string, QueryValue> = {}) {
  return { ...preservedQuery, reviewSearch: query.search, reviewRating: query.rating, reviewSort: query.sort };
}

export function reviewQueryHref(basePath: string, query: Record<string, QueryValue>, anchor = "profile-reviews") {
  const value = buildQueryString(query);
  return `${basePath}${value ? `?${value}` : ""}#${anchor}`;
}

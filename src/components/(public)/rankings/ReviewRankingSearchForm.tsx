import Link from "next/link";

import { REVIEW_RANKING_SEARCH_MAX_LENGTH } from "@/app/(public)/rankings/reviews/query";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";

const BASE_PATH = "/rankings/reviews";

export function ReviewRankingSearchForm({ search, total }: { search?: string; total: number }) {
  return (
    <div className="mt-5 space-y-2">
      <form
        action={BASE_PATH}
        method="GET"
        aria-label="搜尋熱門評論排行榜"
        className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <ClearableSearchInput
          initialValue={search}
          clearHref={BASE_PATH}
          name="q"
          maxLength={REVIEW_RANKING_SEARCH_MAX_LENGTH}
          placeholder="搜尋評論內容"
          aria-label="搜尋評論內容"
          inputClassName="text-base sm:text-sm"
        />
        <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
      </form>

      {search ? (
        <p className="text-sm text-(--text-muted)">
          找到 <strong className="font-semibold tabular-nums text-(--text-primary)">{total}</strong> 則符合「{search}」的評論
          <span aria-hidden="true"> · </span>
          <Link
            href={BASE_PATH}
            className="font-medium text-(--action) hover:text-(--action-hover) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            清除搜尋
          </Link>
        </p>
      ) : null}
    </div>
  );
}

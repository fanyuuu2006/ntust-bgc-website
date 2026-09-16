import type { ReactNode } from "react";

import { ProfileReviewItems } from "@/components/(public)/profile/ProfileReviews";
import { hasReviewCriteria, ReviewQueryControls, ReviewResultSummary, reviewAppliedQuery, reviewQueryHref } from "@/components/(public)/reviews/ReviewQueryControls";
import { Pagination } from "@/components/Pagination/Pagination";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PublicProfileReview, PublicProfileReviewsPage, ReviewListQuery } from "@/services/reviews/reviews.types";

export function ProfileReviewCollection({ basePath, reviews, query, own, renderActions }: {
  basePath: string;
  reviews: PublicProfileReviewsPage;
  query: ReviewListQuery;
  own: boolean;
  renderActions?: (review: PublicProfileReview) => ReactNode;
}) {
  const appliedQuery = reviewAppliedQuery(query);
  const hasCriteria = hasReviewCriteria(query);
  const resetHref = reviewQueryHref(basePath, { reviewSort: query.sort === "newest" ? undefined : query.sort });

  return (
    <section id="profile-reviews" aria-labelledby="profile-reviews-title">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="profile-reviews-title" className="text-lg font-bold text-(--text-primary)">桌遊評分與評論</h2>
          <ReviewResultSummary total={reviews.total} filtered={hasCriteria} />
        </div>
        <ReviewQueryControls basePath={basePath} query={query} searchPlaceholder="搜尋桌遊或評論內容" searchLabel={own ? "搜尋我的評價" : "搜尋公開評價"} />

        {reviews.total === 0 ? (
          hasCriteria ? (
            <QueryEmptyState className="mt-4" title="找不到符合條件的評價" description="試著調整搜尋或評分條件。" clearHref={resetHref} />
          ) : own ? (
            <div className="mt-4 rounded-xl bg-(--surface-subtle) p-4 text-sm text-(--text-muted)">
              <p>你還沒有評分任何桌遊。</p>
              <ButtonLink href="/board-games" variant="text" size="sm" className="mt-2 px-0">找桌遊來評分</ButtonLink>
            </div>
          ) : <p className="mt-4 text-sm text-(--text-muted)">尚未留下桌遊評分</p>
        ) : <ProfileReviewItems reviews={reviews} renderActions={renderActions} />}

        <Pagination page={reviews.page} pageSize={reviews.pageSize} total={reviews.total} totalPages={reviews.totalPages} basePath={basePath} query={appliedQuery} pageKey="reviewPage" showPageSize={false} className="mt-5 border-t border-(--border-muted) pt-4" />
      </Card>
    </section>
  );
}

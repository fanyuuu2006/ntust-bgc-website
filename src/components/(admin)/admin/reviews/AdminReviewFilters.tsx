import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { QueryFilterForm } from "@/components/query/QueryFilterForm";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { ReviewSort } from "@/services/reviews/reviews.types";
import { buildQueryString } from "@/utils/url";
import { AdminBoardGameFilter, type AdminBoardGameFilterValue } from "./AdminBoardGameFilter";

type Query = {
  search?: string;
  rating?: number;
  boardGameId?: string;
  sort: ReviewSort;
  pageSize: number;
};

export function AdminReviewFilters({
  query,
  selectedBoardGame,
}: {
  query: Query;
  selectedBoardGame: AdminBoardGameFilterValue | null;
}) {
  const clearSearchQuery = buildQueryString(query, { search: undefined });

  return (
    <AdminToolbar>
      <QueryFilterForm
        appliedQuery={query}
        ownedKeys={["search", "rating", "boardGameId", "sort"]}
        clearHref="/admin/reviews"
        aria-label="搜尋與篩選評價與評論"
        className="grid min-w-0 gap-3 rounded-xl border border-(--border-default) bg-(--surface-elevated) p-4 md:grid-cols-2 lg:grid-cols-[minmax(15rem,1.2fr)_8rem_minmax(16rem,1fr)]"
        actionsClassName="md:col-span-2 lg:col-span-3"
      >
        <Field label="搜尋" htmlFor="admin-review-search">
          <ClearableSearchInput
            id="admin-review-search"
            name="search"
            initialValue={query.search}
            clearHref={clearSearchQuery ? `/admin/reviews?${clearSearchQuery}` : "/admin/reviews"}
            placeholder="搜尋評論、作者或桌遊"
            aria-label="搜尋評價與評論"
          />
        </Field>
        <Field label="評價" htmlFor="admin-review-rating">
          <Select id="admin-review-rating" name="rating" defaultValue={query.rating ?? ""} className="w-full">
            <option value="">全部評價</option>
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} 星</option>)}
          </Select>
        </Field>
        <Field label="桌遊" htmlFor="admin-review-board-game" className="md:col-span-2 lg:col-span-1">
          <AdminBoardGameFilter id="admin-review-board-game" selected={selectedBoardGame} />
        </Field>
        <Field label="排序" htmlFor="admin-review-sort" className="md:col-span-2 lg:hidden">
          <Select id="admin-review-sort" name="sort" defaultValue={query.sort} className="w-full">
            <option value="newest">最新優先</option>
            <option value="oldest">最舊優先</option>
            <option value="highest">評價高到低</option>
            <option value="lowest">評價低到高</option>
          </Select>
        </Field>
        <input type="hidden" name="pageSize" value={query.pageSize} />
      </QueryFilterForm>
    </AdminToolbar>
  );
}

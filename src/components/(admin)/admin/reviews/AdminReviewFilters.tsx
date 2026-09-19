import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { QueryFilterDisclosure } from "@/components/query/QueryFilterDisclosure";
import { QueryFilterForm } from "@/components/query/QueryFilterForm";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { buildOwnedQueryHref } from "@/libs/query-navigation";
import type { ReviewSort } from "@/services/reviews/reviews.types";
import { buildQueryString } from "@/utils/url";
import { AdminBoardGameFilter, type AdminBoardGameFilterValue } from "./AdminBoardGameFilter";

const BASE_PATH = "/admin/reviews";

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
  const clearFiltersHref = buildOwnedQueryHref({
    basePath: BASE_PATH,
    appliedQuery: query,
    ownedKeys: ["rating", "boardGameId"],
    changes: {},
  });
  const activeFilterCount = [query.rating, query.boardGameId].filter(Boolean).length;

  return (
    <AdminToolbar className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <form
        method="GET"
        action={BASE_PATH}
        className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        aria-label="搜尋評價與評論"
      >
        <PreservedQueryFields query={query} ownedKeys={["search"]} />
        <ClearableSearchInput
          name="search"
          initialValue={query.search}
          clearHref={clearSearchQuery ? `${BASE_PATH}?${clearSearchQuery}` : BASE_PATH}
          placeholder="搜尋評論、作者或桌遊"
          aria-label="搜尋評價與評論"
        />
        <Button type="submit" variant="primary" className="w-full sm:w-auto">
          搜尋
        </Button>
      </form>
      <div className="grid grid-cols-2 gap-2 lg:flex lg:justify-end">
        <QueryFilterDisclosure
          label={activeFilterCount ? `篩選 (${activeFilterCount})` : "篩選"}
          panelClassName="lg:min-w-80"
        >
          <QueryFilterForm
            method="GET"
            action={BASE_PATH}
            appliedQuery={query}
            ownedKeys={["rating", "boardGameId"]}
            clearHref={clearFiltersHref}
            className="grid gap-3"
          >
            <PreservedQueryFields query={query} ownedKeys={["rating", "boardGameId"]} />
            <Field label="評價" htmlFor="admin-review-rating">
              <Select
                id="admin-review-rating"
                name="rating"
                defaultValue={query.rating ?? ""}
                className="w-full"
              >
                <option value="">全部評價</option>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>{rating} 星</option>
                ))}
              </Select>
            </Field>
            <Field label="桌遊" htmlFor="admin-review-board-game">
              <AdminBoardGameFilter
                id="admin-review-board-game"
                selected={selectedBoardGame}
              />
            </Field>
          </QueryFilterForm>
        </QueryFilterDisclosure>
        <ImmediateQuerySelect
          appliedQuery={query}
          basePath={BASE_PATH}
          queryKey="sort"
          value={query.sort}
          aria-label="評價與評論排序"
          className="w-full lg:hidden"
        >
          <option value="newest">最新優先</option>
          <option value="oldest">最舊優先</option>
          <option value="highest">評價高到低</option>
          <option value="lowest">評價低到高</option>
        </ImmediateQuerySelect>
      </div>
    </AdminToolbar>
  );
}

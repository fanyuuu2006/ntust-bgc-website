import Link from "next/link";
import { ArrowUpDown } from "lucide-react";

import {
  BASE_PATH,
  SORT_OPTIONS,
  STATUS_META,
} from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { BoardGameFilterDisclosure } from "@/components/(public)/board-games/BoardGameFilterDisclosure";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { Button } from "@/components/ui/Button";
import { buildOwnedQueryHref } from "@/libs/query-navigation";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";

type BoardGameSearchFormProps = {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
  pageSize: number;
  total: number;
};

export function BoardGameSearchForm({
  categories,
  locations,
  query,
  pageSize,
  total,
}: BoardGameSearchFormProps) {
  const hasFilters = Boolean(
    query.search ||
    query.status?.length ||
    query.category?.length ||
    query.location?.length ||
    query.sort !== "popular",
  );
  const appliedQuery = {
    search: query.search,
    status: query.status,
    category: query.category,
    location: query.location,
    sort: query.sort,
    pageSize,
  };
  const clearSearchHref = buildOwnedQueryHref({
    basePath: BASE_PATH,
    appliedQuery,
    ownedKeys: ["search"],
    changes: { search: undefined },
  });
  const clearFiltersHref = buildOwnedQueryHref({
    basePath: BASE_PATH,
    appliedQuery,
    ownedKeys: ["status", "category", "location"],
    changes: {},
  });
  const activeFilterCount =
    (query.status?.length ?? 0) +
    (query.category?.length ?? 0) +
    (query.location?.length ?? 0);

  return (
    <div className="space-y-2">
      <div className="relative grid min-w-0 grid-cols-2 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <form
          method="GET"
          action={BASE_PATH}
          aria-label="搜尋桌遊"
          className="col-span-2 grid min-w-0 gap-2 sm:col-span-1 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <PreservedQueryFields query={appliedQuery} ownedKeys={["search"]} />
          <ClearableSearchInput
            id="board-game-search"
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊"
            aria-label="搜尋桌遊"
            inputClassName="text-base sm:text-sm"
          />
          <Button type="submit" variant="primary" className="w-full sm:w-auto">
            搜尋
          </Button>
        </form>

        <BoardGameFilterDisclosure
          statusOptions={(Object.keys(STATUS_META) as BoardGameStatus[]).map(
            (status) => ({
              value: status,
              label: STATUS_META[status].label,
            }),
          )}
          categoryOptions={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          locationOptions={locations.map((location) => ({
            value: location.id,
            label: location.name,
          }))}
          selectedStatuses={query.status}
          selectedCategories={query.category}
          selectedLocations={query.location}
          appliedQuery={appliedQuery}
          clearFiltersHref={clearFiltersHref}
          activeFilterCount={activeFilterCount}
        />

        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-within:border-(--interactive-primary) focus-within:outline-2 focus-within:outline-(--focus-ring)">
          <ArrowUpDown
            aria-hidden="true"
            className="size-4 shrink-0 text-(--text-muted)"
          />
          <span className="sr-only">排序</span>
          <ImmediateQuerySelect
            appliedQuery={appliedQuery}
            basePath={BASE_PATH}
            queryKey="sort"
            value={query.sort}
            focusOwner="parent"
            className="min-h-0 min-w-0 border-0 bg-transparent px-0 py-0"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </ImmediateQuerySelect>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--text-muted)">
        <p aria-live="polite">共找到 {total} 款桌遊</p>
        {hasFilters ? (
          <Link
            href={BASE_PATH}
            className="font-medium text-(--action) hover:text-(--action-hover) hover:underline"
          >
            清除條件
          </Link>
        ) : null}
      </div>
    </div>
  );
}

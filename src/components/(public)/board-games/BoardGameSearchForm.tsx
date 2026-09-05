import Link from "next/link";
import { ArrowUpDown, ListFilter } from "lucide-react";

import { BASE_PATH, SORT_OPTIONS, STATUS_META } from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { BoardGameCategory, BoardGameLocation, BoardGameStatus } from "@/types/database";
import { buildQueryString } from "@/utils/url";

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
      query.orderBy !== "created_at" ||
      query.orderDirection !== "desc",
  );
  const clearSearchQuery = buildQueryString({
    status: query.status,
    category: query.category,
    location: query.location,
    sort: `${query.orderBy}:${query.orderDirection}`,
    page: 1,
    pageSize,
  });
  const clearSearchHref = `${BASE_PATH}?${clearSearchQuery}`;

  return (
    <form method="GET" action={BASE_PATH} className="space-y-3">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={pageSize} />

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
        <ClearableSearchInput
          id="board-game-search"
          initialValue={query.search}
          clearHref={clearSearchHref}
          name="search"
          placeholder="搜尋桌遊"
          aria-label="搜尋桌遊"
          className="col-span-2 sm:col-span-1"
          inputClassName="text-base sm:text-sm"
        />

        <Button type="submit" variant="primary" className="col-span-2 w-full sm:col-span-1 sm:w-auto">
          搜尋
        </Button>

        <details className="group sm:relative">
          <summary className="btn outline flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium marker:content-none">
            <ListFilter aria-hidden="true" className="size-4" />
            篩選
          </summary>
          <div className="mt-2 grid gap-4 rounded-xl border border-(--border-default) bg-(--surface-default) p-4 sm:absolute sm:right-0 sm:z-10 sm:min-w-80 sm:grid-cols-3 sm:shadow-(--shadow-card)">
            <FilterGroup label="狀態">
              {(Object.keys(STATUS_META) as BoardGameStatus[]).map((status) => (
                <FilterCheckbox key={status} name="status" value={status} label={STATUS_META[status].label} defaultChecked={query.status?.includes(status)} />
              ))}
            </FilterGroup>
            <FilterGroup label="類型">
              {categories.map((category) => (
                <FilterCheckbox key={category.id} name="category" value={category.id} label={category.name} defaultChecked={query.category?.includes(category.id)} />
              ))}
            </FilterGroup>
            <FilterGroup label="位置">
              {locations.map((location) => (
                <FilterCheckbox key={location.id} name="location" value={location.id} label={location.name} defaultChecked={query.location?.includes(location.id)} />
              ))}
            </FilterGroup>
          </div>
        </details>

        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-within:border-(--interactive-primary) focus-within:outline-2 focus-within:outline-(--focus-ring)">
          <ArrowUpDown aria-hidden="true" className="size-4 shrink-0 text-(--text-muted)" />
          <span className="sr-only">排序</span>
          <Select name="sort" defaultValue={`${query.orderBy}:${query.orderDirection}`} focusOwner="parent" className="min-h-0 min-w-0 border-0 bg-transparent px-0 py-0">
            {SORT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </Select>
        </label>

      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--text-muted)">
        <p aria-live="polite">共找到 {total} 款桌遊</p>
        {hasFilters ? <Link href={BASE_PATH} className="font-medium text-(--action) hover:text-(--action-hover) hover:underline">清除條件</Link> : null}
      </div>
    </form>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <fieldset className="min-w-0 space-y-2"><legend className="text-xs font-semibold text-(--text-muted)">{label}</legend><div className="space-y-1.5">{children}</div></fieldset>;
}

function FilterCheckbox({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return <label className="flex min-h-8 items-center gap-2 text-sm text-(--text-primary)"><input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} /><span className="min-w-0 truncate">{label}</span></label>;
}

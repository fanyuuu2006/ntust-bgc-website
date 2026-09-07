import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { QueryFilterDisclosure } from "@/components/query/QueryFilterDisclosure";
import { QueryFilterForm } from "@/components/query/QueryFilterForm";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { buildOwnedQueryHref } from "@/libs/query-navigation";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";

const BASE_PATH = "/admin/board-games";

const STATUS_OPTIONS: Array<{ value: BoardGameStatus; label: string }> = [
  { value: "available", label: "可借用" },
  { value: "borrowed", label: "已借出" },
  { value: "maintenance", label: "維護中" },
  { value: "lost", label: "遺失" },
  { value: "damaged", label: "損壞" },
  { value: "retired", label: "已除役" },
];

type BoardGameSearchFormProps = {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
  clearSearchHref: string;
};

export function BoardGameSearchForm({
  categories,
  locations,
  query,
  clearSearchHref,
}: BoardGameSearchFormProps) {
  const activeFilterCount = [query.status, query.category, query.location].filter(Boolean).length;
  const clearFiltersHref = buildOwnedQueryHref({
    basePath: BASE_PATH,
    appliedQuery: query,
    ownedKeys: ["status", "category", "location"],
    changes: {},
  });

  return (
    <AdminToolbar className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <form
        method="GET"
        action={BASE_PATH}
        aria-label="搜尋桌遊"
        className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
          <PreservedQueryFields query={query} ownedKeys={["search"]} />
          <ClearableSearchInput
            id="board-game-search"
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊名稱、社產編號或描述"
            aria-label="搜尋桌遊名稱、社產編號或描述"
            className="w-full"
          />
          <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
      </form>
      <QueryFilterDisclosure
        label={activeFilterCount ? `篩選 (${activeFilterCount})` : "篩選"}
        panelClassName="lg:min-w-80"
      >
        <QueryFilterForm
          method="GET"
          action={BASE_PATH}
          appliedQuery={query}
          ownedKeys={["status", "category", "location"]}
          clearHref={clearFiltersHref}
          className="grid gap-3"
        >
          <PreservedQueryFields query={query} ownedKeys={["status", "category", "location"]} />
          <FilterSelect name="status" label="狀態" value={query.status}>
            <option value="">全部狀態</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="category" label="分類" value={query.category}>
            <option value="">全部分類</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="location" label="位置" value={query.location}>
            <option value="">全部位置</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </FilterSelect>
        </QueryFilterForm>
      </QueryFilterDisclosure>
    </AdminToolbar>
  );
}

function FilterSelect({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
      {label}
      <Select name={name} defaultValue={value ?? ""} className="w-full">
        {children}
      </Select>
    </label>
  );
}

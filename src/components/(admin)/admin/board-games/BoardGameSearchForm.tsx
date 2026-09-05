import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { QueryFilterDisclosure } from "@/components/query/QueryFilterDisclosure";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
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
  return (
    <form method="GET" action={BASE_PATH}>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={query.pageSize ?? 20} />
      <input type="hidden" name="orderBy" value={query.orderBy ?? "created_at"} />
      <input type="hidden" name="orderDirection" value={query.orderDirection ?? "desc"} />
      <AdminToolbar className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <ClearableSearchInput
            id="board-game-search"
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊名稱、社產編號或描述"
            aria-label="搜尋桌遊名稱、社產編號或描述"
            className="w-full"
          />
          <Button type="submit" variant="primary" className="w-full lg:w-auto">搜尋</Button>
        <QueryFilterDisclosure panelClassName="lg:min-w-80">
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
        </QueryFilterDisclosure>
      </AdminToolbar>
    </form>
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

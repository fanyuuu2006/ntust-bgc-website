import Link from "next/link";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";
import { cn } from "@/utils/className";

const STATUS_OPTIONS: { value: BoardGameStatus; label: string }[] = [
  { value: "available", label: "可借用" },
  { value: "borrowed", label: "已借出" },
  { value: "maintenance", label: "維護中" },
  { value: "lost", label: "遺失" },
  { value: "damaged", label: "損壞" },
  { value: "retired", label: "已除役" },
];

const BASE_PATH = "/admin/board-games";

type BoardGamesQuery = {
  search?: string;
  status?: BoardGameStatus[];
  category?: string[];
  location?: string[];
};

type SearchFormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
};

/* ============================================================ *
 * SearchForm
 * ============================================================ */

export function SearchForm({
  categories,
  locations,
  query,
  className,
  ...rest
}: SearchFormProps) {
  const statusCount = query.status?.length ?? 0;
  const categoryCount = query.category?.length ?? 0;
  const locationCount = query.location?.length ?? 0;

  const hasActiveFilters =
    Boolean(query.search) || statusCount + categoryCount + locationCount > 0;

  // query 變動時重掛載表單，確保 uncontrolled input 與網址列 query 同步
  const formKey = [
    query.search ?? "",
    query.status?.join(",") ?? "",
    query.category?.join(",") ?? "",
    query.location?.join(",") ?? "",
  ].join("|");

  return (
    <form
      key={formKey}
      method="GET"
      className={cn(
        "card flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center",
        className,
      )}
      {...rest}
    >
      <div className="relative shrink-0 sm:w-64">
        <label className="sr-only" htmlFor="board-game-search">
          搜尋桌遊名稱或編號
        </label>
        <input
          id="board-game-search"
          type="search"
          name="search"
          autoComplete="off"
          defaultValue={query.search}
          placeholder="搜尋桌遊名稱或編號"
          className="w-full rounded-lg border border-(--border) bg-(--secondary-background) py-2 pr-16 pl-3 text-sm text-(--foreground) outline-none transition focus:border-(--primary)"
        />
        <button
          type="submit"
          className="btn primary absolute top-1 right-1 bottom-1 rounded-md px-3 text-xs"
        >
          搜尋
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="狀態" count={statusCount}>
          {STATUS_OPTIONS.map((option) => (
            <FilterOption
              key={option.value}
              name="status"
              value={option.value}
              label={option.label}
              defaultChecked={query.status?.includes(option.value)}
            />
          ))}
        </FilterChip>

        <FilterChip label="分類" count={categoryCount}>
          {categories.map((category) => (
            <FilterOption
              key={category.id}
              name="category"
              value={category.id}
              label={category.name}
              defaultChecked={query.category?.includes(category.id)}
            />
          ))}
        </FilterChip>

        <FilterChip label="位置" count={locationCount}>
          {locations.map((location) => (
            <FilterOption
              key={location.id}
              name="location"
              value={location.id}
              label={location.name}
              defaultChecked={query.location?.includes(location.id)}
            />
          ))}
        </FilterChip>

        {hasActiveFilters && (
          <Link
            href={BASE_PATH}
            className="inline-flex h-8 shrink-0 items-center rounded-full border border-(--border) px-3 text-sm text-(--muted) transition hover:border-(--primary) hover:text-(--primary)"
          >
            清除
          </Link>
        )}
      </div>
    </form>
  );
}

/* ============================================================ *
 * FilterChip：單一篩選群組（下拉多選）
 * ============================================================ */

type FilterChipProps = {
  label: string;
  count: number;
  children: React.ReactNode;
};

function FilterChip({ label, count, children }: FilterChipProps) {
  const isActive = count > 0;

  return (
    <details className="group relative">
      <summary
        className={cn(
          "flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 text-sm transition [&::-webkit-details-marker]:hidden",
          isActive ? "border-(--primary)" : "border-(--border)",
          "text-(--foreground)",
        )}
      >
        {label}
        {isActive && <span className="text-(--primary)">({count})</span>}
        <span className="text-xs text-(--muted) transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="card absolute top-[calc(100%+0.5rem)] left-0 z-10 max-h-64 w-max min-w-32 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md py-1">
        {children}
      </div>
    </details>
  );
}

/* ============================================================ *
 * FilterOption：下拉選單內的單一 checkbox 項目
 * ============================================================ */

type FilterOptionProps = {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
};

function FilterOption({
  name,
  value,
  label,
  defaultChecked,
}: FilterOptionProps) {
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap text-(--foreground) hover:bg-(--secondary-background)">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-(--border) accent-(--primary)"
      />
      {label}
    </label>
  );
}

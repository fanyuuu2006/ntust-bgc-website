import type { BoardGameCategory, BoardGameLocation } from "@/types/database";
import { BASE_PATH } from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { BoardGameFilterPanel } from "@/components/(public)/board-games/BoardGameFilterPanel";
import { BoardGameActiveFilters } from "@/components/(public)/board-games/BoardGameActiveFilters";
import { cn } from "@/utils/className";

type BoardGameSearchFormProps = React.HTMLAttributes<HTMLDivElement> & {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
  pageSize: number;
};

export function BoardGameSearchForm({
  categories,
  locations,
  query,
  pageSize,
  className,
  ...rest
}: BoardGameSearchFormProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-(--border) bg-(--primary-background) p-3 sm:p-4",
        className,
      )}
      {...rest}
    >
      <form method="GET" action={BASE_PATH}>
        <label className="sr-only" htmlFor="board-game-search">
          搜尋桌遊名稱、編號或描述
        </label>

        <div className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--secondary-background) px-3 py-2">
          <input
            id="board-game-search"
            type="search"
            name="search"
            autoComplete="off"
            defaultValue={query.search}
            placeholder="搜尋桌遊名稱、編號或描述"
            className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-(--foreground) outline-none placeholder:text-(--muted)"
          />
          <button
            type="submit"
            className="btn primary shrink-0 rounded-lg px-4 py-1.5 text-sm"
          >
            搜尋
          </button>
        </div>

        {query.status?.map((value) => (
          <input
            key={`status-${value}`}
            type="hidden"
            name="status"
            value={value}
          />
        ))}
        {query.category?.map((value) => (
          <input
            key={`category-${value}`}
            type="hidden"
            name="category"
            value={value}
          />
        ))}
        {query.location?.map((value) => (
          <input
            key={`location-${value}`}
            type="hidden"
            name="location"
            value={value}
          />
        ))}
        <input type="hidden" name="orderBy" value={query.orderBy} />
        <input
          type="hidden"
          name="orderDirection"
          value={query.orderDirection}
        />
        <input type="hidden" name="pageSize" value={pageSize} />
      </form>

      <BoardGameFilterPanel
        categories={categories}
        locations={locations}
        query={query}
      />

      <BoardGameActiveFilters
        categories={categories}
        locations={locations}
        query={query}
      />
    </div>
  );
}

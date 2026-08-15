import Link from "next/link";
import type { BoardGameCategory, BoardGameLocation } from "@/types/database";
import {
  BASE_PATH,
  ORDER_BY_OPTIONS,
} from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { BoardGameFilterBar } from "@/components/(public)/board-games/BoardGameFilterBar";
import { buildQueryString } from "@/utils/url";
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
  const hasActiveFilters =
    Boolean(query.search) ||
    (query.status?.length ?? 0) > 0 ||
    (query.category?.length ?? 0) > 0 ||
    (query.location?.length ?? 0) > 0;

  const nextDirection = query.orderDirection === "asc" ? "desc" : "asc";
  const directionHref = `${BASE_PATH}?${buildQueryString(
    { ...query, page: 1 },
    {
      orderDirection: nextDirection,
    },
  )}`;

  return (
    <div className={cn("card rounded-2xl p-4 sm:p-5", className)} {...rest}>
      <form
        method="GET"
        action={BASE_PATH}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <label className="sr-only" htmlFor="board-game-search">
          搜尋桌遊名稱、編號或描述
        </label>

        <div className="relative min-w-0 flex-1 sm:max-w-100">
          <input
            id="board-game-search"
            type="search"
            name="search"
            autoComplete="off"
            defaultValue={query.search}
            placeholder="搜尋桌遊名稱、編號或描述"
            className="w-full rounded-lg border border-(--border) bg-(--secondary-background) py-2 pr-16 pl-3 text-sm text-(--foreground) outline-none transition focus:border-(--primary)"
          />
          <button
            type="submit"
            className="btn primary absolute top-1 right-1 bottom-1 shrink-0 rounded-md px-3 text-xs"
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
        <input
          type="hidden"
          name="orderDirection"
          value={query.orderDirection}
        />
        <input type="hidden" name="pageSize" value={pageSize} />

        <label className="sr-only" htmlFor="board-game-order-by">
          排序欄位
        </label>
        <select
          id="board-game-order-by"
          name="orderBy"
          defaultValue={query.orderBy}
          className="shrink-0 rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm text-(--foreground) outline-none focus:border-(--primary)"
        >
          {ORDER_BY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Link
          href={directionHref}
          aria-label={`切換為${nextDirection === "asc" ? "升冪" : "降冪"}排序`}
          className="btn shrink-0 rounded-lg px-3 py-2 text-sm"
        >
          {query.orderDirection === "asc" ? "升冪" : "降冪"}
        </Link>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BoardGameFilterBar
          categories={categories}
          locations={locations}
          query={query}
        />

        {hasActiveFilters && (
          <Link
            href={BASE_PATH}
            className="btn shrink-0 rounded-full px-3 py-1 text-sm"
          >
            清除
          </Link>
        )}
      </div>
    </div>
  );
}

import type { BoardGameCategory, BoardGameLocation } from "@/types/database";
import { BASE_PATH } from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { BoardGameFilterPanel } from "@/components/(public)/board-games/BoardGameFilterPanel";
import { cn } from "@/utils/className";

type BoardGameSearchFormProps = React.HTMLAttributes<HTMLDivElement> & {
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
  className,
  ...rest
}: BoardGameSearchFormProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-(--border) bg-(--primary-background) p-3 shadow-(--shadow-base)",
        className,
      )}
      {...rest}
    >
      <form method="GET" action={BASE_PATH}>
        <label className="sr-only" htmlFor="board-game-search">
          搜尋桌遊名稱、編號或描述
        </label>

        <div className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--secondary-background) p-2 focus-within:border-(--primary)">
          <input
            id="board-game-search"
            type="search"
            name="search"
            autoComplete="off"
            defaultValue={query.search}
            placeholder="搜尋名稱、社產編號或描述"
            className="min-h-10 min-w-0 flex-1 border-0 bg-transparent px-2 text-base text-(--foreground) outline-none placeholder:text-(--muted) sm:text-sm"
          />
          <button
            type="submit"
            className="btn primary min-h-10 shrink-0 rounded-lg px-4 text-sm font-medium"
          >
            搜尋
          </button>
        </div>

        <HiddenQueryArray name="status" values={query.status} />
        <HiddenQueryArray name="category" values={query.category} />
        <HiddenQueryArray name="location" values={query.location} />
        <input type="hidden" name="orderBy" value={query.orderBy} />
        <input
          type="hidden"
          name="orderDirection"
          value={query.orderDirection}
        />
        <input type="hidden" name="pageSize" value={pageSize} />
      </form>

      <div className="border-t border-(--border) pt-3">
        <p className="text-sm text-(--muted)" aria-live="polite">
          找到{" "}
          <span className="font-semibold text-(--foreground)">{total}</span>{" "}
          款桌遊
        </p>
      </div>

      <BoardGameFilterPanel
        categories={categories}
        locations={locations}
        query={query}
      />
    </div>
  );
}

type HiddenQueryArrayProps = {
  name: string;
  values?: string[];
};

function HiddenQueryArray({ name, values }: HiddenQueryArrayProps) {
  return values?.map((value) => (
    <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
  ));
}

import type { BoardGameCategory, BoardGameLocation } from "@/types/database";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { cn } from "@/utils/className";
import { BoardGameFilterBar } from "@/components/(admin)/admin/board-games/BoardGameFilterBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type BoardGameSearchFormProps = React.HTMLAttributes<HTMLDivElement> & {
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
  className,
  ...rest
}: BoardGameSearchFormProps) {
  return (
    <Card
      className={cn(
        "sticky top-4 z-10 flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-center",
        className,
      )}
      {...rest}
    >
      <form
        key={query.search ?? ""}
        method="GET"
        className="flex w-full min-w-0 items-center gap-2 lg:flex-1"
      >
        <label className="sr-only" htmlFor="board-game-search">
          搜尋桌遊名稱、編號或相關描述
        </label>
        <ClearableSearchInput
          id="board-game-search"
          initialValue={query.search}
          clearHref={clearSearchHref}
          name="search"
          placeholder="搜尋桌遊名稱、編號或相關描述"
          className="min-w-0 flex-1"
          inputClassName="py-2 pl-3"
        />
        <Button
          type="submit"
          size="sm"
          className="shrink-0 rounded-md px-3"
        >
          搜尋
        </Button>

        {/* 維持原生 GET 表單送出，並帶入目前的搜尋文字與其他篩選條件 */}
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
      </form>

      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
        <BoardGameFilterBar
          categories={categories}
          locations={locations}
          query={query}
        />

      </div>
    </Card>
  );
}

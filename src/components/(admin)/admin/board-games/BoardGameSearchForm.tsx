import type { BoardGameCategory, BoardGameLocation } from "@/types/database";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { cn } from "@/utils/className";
import { BoardGameFilterBar } from "@/components/(admin)/admin/board-games/BoardGameFilterBar";
import { BASE_PATH } from "@/app/(admin)/admin/board-games/constants";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type BoardGameSearchFormProps = React.HTMLAttributes<HTMLDivElement> & {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
};

export function BoardGameSearchForm({
  categories,
  locations,
  query,
  className,
  ...rest
}: BoardGameSearchFormProps) {
  const statusCount = query.status?.length ?? 0;
  const categoryCount = query.category?.length ?? 0;
  const locationCount = query.location?.length ?? 0;

  const hasActiveFilters =
    Boolean(query.search) || statusCount + categoryCount + locationCount > 0;

  return (
    <Card
      className={cn(
        "sticky top-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl p-4",
        className,
      )}
      {...rest}
    >
      <form
        key={query.search ?? ""}
        method="GET"
        className="relative w-full shrink-0 sm:max-w-100"
      >
        <label className="sr-only" htmlFor="board-game-search">
          搜尋桌遊名稱、編號或相關描述
        </label>
        <Input
          id="board-game-search"
          type="search"
          name="search"
          autoComplete="off"
          defaultValue={query.search}
          placeholder="搜尋桌遊名稱、編號或相關描述"
          className="w-full py-2 pr-16 pl-3"
        />
        <Button
          type="submit"
          size="sm"
          className="absolute top-1 right-1 bottom-1 rounded-md px-3"
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

      <div className="flex flex-wrap items-center gap-2">
        <BoardGameFilterBar
          categories={categories}
          locations={locations}
          query={query}
        />

        {hasActiveFilters && (
          <ButtonLink href={BASE_PATH} variant="outline" size="sm" className="rounded-full">
            清除
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

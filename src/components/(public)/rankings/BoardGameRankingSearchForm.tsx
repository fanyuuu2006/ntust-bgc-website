import Link from "next/link";

import { BOARD_GAME_RANKING_SEARCH_MAX_LENGTH } from "@/app/(public)/rankings/board-games/query";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import type { BoardGameRanking } from "@/repositories/board-game-statistics.repository";

const BASE_PATH = "/rankings/board-games";

function buildClearHref(ranking: BoardGameRanking) {
  return ranking === "popular"
    ? BASE_PATH
    : `${BASE_PATH}?ranking=${ranking}`;
}

export function BoardGameRankingSearchForm({
  ranking,
  search,
  total,
}: {
  ranking: BoardGameRanking;
  search?: string;
  total: number;
}) {
  const clearHref = buildClearHref(ranking);

  return (
    <div className="mt-5 space-y-2">
      <form
        action={BASE_PATH}
        method="GET"
        aria-label="搜尋桌遊排行榜"
        className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        {ranking !== "popular" ? <input type="hidden" name="ranking" value={ranking} /> : null}
        <ClearableSearchInput
          initialValue={search}
          clearHref={clearHref}
          name="q"
          maxLength={BOARD_GAME_RANKING_SEARCH_MAX_LENGTH}
          placeholder="搜尋桌遊名稱"
          aria-label="搜尋桌遊名稱"
          inputClassName="text-base sm:text-sm"
        />
        <Button type="submit" variant="primary" className="w-full sm:w-auto">
          搜尋
        </Button>
      </form>

      {search ? (
        <p className="text-sm text-(--text-muted)">
          找到 <strong className="font-semibold tabular-nums text-(--text-primary)">{total}</strong> 款符合「{search}」的桌遊
          <span aria-hidden="true"> · </span>
          <Link
            href={clearHref}
            className="font-medium text-(--action) hover:text-(--action-hover) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            清除搜尋
          </Link>
        </p>
      ) : null}
    </div>
  );
}

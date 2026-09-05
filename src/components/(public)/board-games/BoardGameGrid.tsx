import { BoardGameCard } from "@/components/(public)/board-games/BoardGameCard";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";

const BASE_PATH = "/board-games";

type BoardGameGridProps = {
  boardGames: BoardGameWithCategoryAndLocation[];
  hasActiveQuery: boolean;
};

export function BoardGameGrid({
  boardGames,
  hasActiveQuery,
}: BoardGameGridProps) {
  if (boardGames.length === 0) {
    if (hasActiveQuery) {
      return (
        <QueryEmptyState
          title="找不到符合條件的桌遊"
          description="試試看減少篩選條件、改用桌遊名稱或社產編號搜尋。"
          clearHref={BASE_PATH}
        />
      );
    }

    return (
      <EmptyState
        title="目前尚無桌遊資料"
        description="等管理員新增桌遊後，這裡會顯示可查詢的社產。"
      />
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
      {boardGames.map((boardGame) => (
        <BoardGameCard key={boardGame.id} boardGame={boardGame} />
      ))}
    </div>
  );
}

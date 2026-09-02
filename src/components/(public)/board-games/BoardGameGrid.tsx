import { BoardGameCard } from "@/components/(public)/board-games/BoardGameCard";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import { EmptyState } from "@/components/ui/EmptyState";

type BoardGameGridProps = {
  boardGames: BoardGameWithCategoryAndLocation[];
  hasActiveQuery: boolean;
};

export function BoardGameGrid({
  boardGames,
  hasActiveQuery,
}: BoardGameGridProps) {
  if (boardGames.length === 0) {
    return (
      <EmptyState
        title={hasActiveQuery ? "找不到符合條件的桌遊" : "目前尚無桌遊資料"}
        description={
          hasActiveQuery
            ? "試試看減少篩選條件、改用桌遊名稱或社產編號搜尋。"
            : "等管理員新增桌遊後，這裡會顯示可查詢的社產。"
        }
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {boardGames.map((boardGame) => (
        <BoardGameCard key={boardGame.id} boardGame={boardGame} />
      ))}
    </div>
  );
}

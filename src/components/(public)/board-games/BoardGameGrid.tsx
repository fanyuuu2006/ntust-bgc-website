import { BoardGameCard } from "@/components/(public)/board-games/BoardGameCard";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";

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
      <div className="rounded-xl border border-dashed border-(--border) bg-(--primary-background) p-8 text-center">
        <p className="text-base font-medium text-(--foreground)">
          {hasActiveQuery ? "找不到符合條件的桌遊" : "目前尚無桌遊資料"}
        </p>
        <p className="mt-2 text-sm text-(--muted)">
          {hasActiveQuery
            ? "試試看減少篩選條件、改用桌遊名稱或社產編號搜尋。"
            : "等管理員新增桌遊後，這裡會顯示可查詢的社產。"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {boardGames.map((boardGame) => (
        <BoardGameCard key={boardGame.id} boardGame={boardGame} />
      ))}
    </div>
  );
}

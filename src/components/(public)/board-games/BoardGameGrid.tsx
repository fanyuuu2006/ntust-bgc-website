import { BoardGameCard } from "@/components/(public)/board-games/BoardGameCard";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";

type BoardGameGridProps = {
  boardGames: BoardGameWithCategoryAndLocation[];
};

export function BoardGameGrid({ boardGames }: BoardGameGridProps) {
  if (boardGames.length === 0) {
    return (
      <div className="card rounded-2xl p-8 text-center">
        <p className="text-base font-medium text-(--foreground)">
          找不到符合條件的桌遊
        </p>
        <p className="mt-2 text-sm text-(--muted)">
          試試看調整關鍵字、分類或狀態條件。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {boardGames.map((boardGame) => (
        <BoardGameCard key={boardGame.id} boardGame={boardGame} />
      ))}
    </div>
  );
}

import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import type { BoardGameStatus } from "@/types/database";
import { cn } from "@/utils/className";

const STATUS_LABEL: Record<BoardGameStatus, string> = {
  available: "可借用",
  borrowed: "已借出",
  maintenance: "維護中",
  lost: "遺失",
  damaged: "損壞",
  retired: "已除役",
};

const STATUS_COLOR: Record<BoardGameStatus, string> = {
  available: "text-(--game-green)",
  borrowed: "text-(--game-blue)",
  maintenance: "text-(--game-yellow)",
  lost: "text-(--game-red)",
  damaged: "text-(--game-red)",
  retired: "text-(--muted)",
};

type BoardGameTableProps = React.HTMLAttributes<HTMLDivElement> & {
  boardGames: BoardGameWithCategoryAndLocation[];
};

/* ============================================================ *
 * BoardGameTable
 * ============================================================ */

export function BoardGameTable({
  boardGames,
  className,
  ...rest
}: BoardGameTableProps) {
  if (boardGames.length === 0) {
    return (
      <div
        className={cn(
          "card flex items-center justify-center rounded-2xl p-12 text-sm text-(--muted)",
          className,
        )}
        {...rest}
      >
        找不到符合條件的桌遊
      </div>
    );
  }

  return (
    <div
      className={cn("card overflow-x-auto rounded-2xl", className)}
      {...rest}
    >
      <table className="w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-(--border) text-(--muted)">
            <th className="px-4 py-3 font-medium">編號</th>
            <th className="px-4 py-3 font-medium">名稱</th>
            <th className="px-4 py-3 font-medium">分類</th>
            <th className="px-4 py-3 font-medium">位置</th>
            <th className="px-4 py-3 font-medium">狀態</th>
            <th className="px-4 py-3 font-medium">更新時間</th>
          </tr>
        </thead>
        <tbody>
          {boardGames.map((boardGame) => (
            <tr
              key={boardGame.id}
              className="border-b border-(--border) last:border-0 hover:bg-(--secondary-background)"
            >
              <td className="px-4 py-3 whitespace-nowrap text-(--muted)">
                {boardGame.inventory_number}
              </td>
              <td className="px-4 py-3 font-medium text-(--foreground)">
                {boardGame.name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {boardGame.category?.name ?? "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {boardGame.location?.name ?? "—"}
              </td>
              <td
                className={cn(
                  "px-4 py-3 whitespace-nowrap font-medium",
                  STATUS_COLOR[boardGame.status],
                )}
              >
                {STATUS_LABEL[boardGame.status]}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-(--muted)">
                {formatDate(boardGame.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

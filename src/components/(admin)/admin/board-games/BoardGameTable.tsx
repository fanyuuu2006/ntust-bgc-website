import Link from "next/link";
import { BoardGameActions } from "@/components/(admin)/admin/board-games/BoardGameActions";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/className";
import { buildQueryString } from "@/utils/url";
import { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { BASE_PATH } from "@/app/(admin)/admin/board-games/constants";

type BoardGameTableProps = React.HTMLAttributes<HTMLDivElement> & {
  boardGames: BoardGameWithCategoryAndLocation[];
  query: BoardGamesQuery;
};

/* ============================================================ *
 * BoardGameTable
 *
 * 欄位優先序（由高到低）：桌遊 > 狀態 > 位置 / 分類 > 編號 / 更新。
 * 採「重排」而非「刪減」：手機版把位置／分類收進名稱副標，
 * 隨斷點（sm / md / lg）逐步展開為獨立欄位，資訊不因裝置縮小而消失。
 * 各欄位皆為固定寬度，僅「桌遊」欄使用剩餘空間，避免互相擠壓。
 * ============================================================ */

const HEADER_CELL = "px-4 py-2 font-medium text-(--muted) whitespace-nowrap";

export function BoardGameTable({
  boardGames,
  query,
  className,
  ...rest
}: BoardGameTableProps) {
  if (boardGames.length === 0) {
    return (
      <div
        className={cn(
          "card flex flex-col items-center justify-center gap-1 rounded-2xl p-12 text-center",
          className,
        )}
        {...rest}
      >
        <p className="text-sm font-medium text-(--foreground)">
          找不到符合條件的桌遊
        </p>
        <p className="text-sm text-(--muted)">請嘗試調整搜尋關鍵字或篩選條件</p>
      </div>
    );
  }

  return (
    <div
      className={cn("card overflow-x-auto rounded-2xl", className)}
      {...rest}
    >
      <table className="w-full text-left text-sm lg:min-w-180">
        <thead className="sticky top-0 z-1 bg-(--secondary-background)">
          <tr className="border-b border-(--border)">
            <SortableHeader
              column="inventory_number"
              label="編號"
              query={query}
              className="w-16"
            />
            <th scope="col" className={cn(HEADER_CELL, "min-w-40")}>
              桌遊
            </th>
            <th scope="col" className={cn(HEADER_CELL, "w-20")}>
              狀態
            </th>
            <th
              scope="col"
              className={cn(HEADER_CELL, "hidden w-24 md:table-cell")}
            >
              位置
            </th>
            <th
              scope="col"
              className={cn(HEADER_CELL, "hidden w-24 md:table-cell")}
            >
              分類
            </th>
            <SortableHeader
              column="updated_at"
              label="最近更新時間"
              query={query}
              className="hidden w-28 lg:table-cell"
            />
            <th scope="col" className={cn(HEADER_CELL, "w-24 text-right")}>
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {boardGames.map((boardGame) => (
            <tr
              key={boardGame.id}
              className="border-b border-(--border) last:border-0 hover:bg-(--secondary-background)"
            >
              <td className="px-4 py-2 align-middle font-mono text-xs whitespace-nowrap text-(--muted)">
                <span>{boardGame.inventory_number}</span>
              </td>

              <td className="px-4 py-2 align-middle">
                <div className="flex items-center gap-2">
                  {boardGame.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={boardGame.image}
                      alt={`桌遊 ${boardGame.name} 的圖片`}
                      className="size-10 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-10 shrink-0 rounded-md bg-(--secondary-background)"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium text-(--foreground)">
                      {boardGame.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-(--muted) md:hidden">
                      {boardGame.category.name} ・ {boardGame.location.name}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-2 align-middle whitespace-nowrap">
                <BoardGameStatusBadge status={boardGame.status} />
              </td>
              <td className="hidden px-4 py-2 align-middle whitespace-nowrap text-(--muted) md:table-cell">
                {boardGame.location.name}
              </td>
              <td className="hidden px-4 py-2 align-middle whitespace-nowrap text-(--muted) md:table-cell">
                {boardGame.category.name}
              </td>
              <td className="hidden px-4 py-2 align-middle whitespace-nowrap text-(--muted) lg:table-cell">
                {formatDate(boardGame.updated_at)}
              </td>
              <td className="px-4 py-2 align-middle">
                <BoardGameActions
                  boardGameId={boardGame.id}
                  boardGameName={boardGame.name}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================ *
 * SortableHeader：點擊切換排序方向並更新 URL
 * ============================================================ */

type SortableHeaderProps = {
  column: string;
  label: string;
  query: BoardGamesQuery;
  className?: string;
};

function SortableHeader({
  column,
  label,
  query,
  className,
}: SortableHeaderProps) {
  const isActive = query.orderBy === column;
  const nextDirection =
    isActive && query.orderDirection === "asc" ? "desc" : "asc";
  const href = `${BASE_PATH}?${buildQueryString(query, {
    orderBy: column,
    orderDirection: nextDirection,
    page: 1,
  })}`;

  return (
    <th scope="col" className={cn(HEADER_CELL, className)}>
      <Link
        href={href}
        className="inline-flex items-center transition hover:text-(--foreground)"
      >
        <span className="truncate">{label}</span>
        {isActive && (
          <span aria-hidden="true" className="shrink-0">
            {query.orderDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </Link>
    </th>
  );
}

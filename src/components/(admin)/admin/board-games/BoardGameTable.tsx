import Link from "next/link";
import { BoardGameActions } from "@/components/(admin)/admin/board-games/BoardGameActions";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/className";
import { buildQueryString } from "@/utils/url";
import { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { BASE_PATH } from "@/app/(admin)/admin/board-games/constants";
import { BoardGameImage } from "@/components/BoardGameImage";

type BoardGameTableProps = React.HTMLAttributes<HTMLDivElement> & {
  boardGames: BoardGameWithCategoryAndLocation[];
  query: BoardGamesQuery;
};

/* ============================================================ *
 * BoardGameTable
 *
 * 欄位優先序（由高到低）：桌遊 > 狀態 > 位置 / 分類 > 編號 / 更新。
 * 編號在所有斷點皆顯示（管理者對照實體庫存必備），因此整體 padding
 * 採較緊湊的設定，確保手機版仍能容納「編號、桌遊、狀態、操作」。
 * 位置／分類在手機收進名稱副標，隨斷點（md / lg）展開為獨立欄位。
 * 各欄位皆為固定寬度，僅「桌遊」欄使用剩餘空間，避免互相擠壓。
 * ============================================================ */

const HEADER_CELL =
  "px-2 py-2 font-medium text-(--muted) whitespace-nowrap sm:px-3";
const BODY_CELL = "px-2 py-2 align-middle sm:px-3 sm:py-2.5";

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
              className="w-10 text-center sm:w-12"
            />
            <th scope="col" className={cn(HEADER_CELL, "min-w-32 sm:min-w-40")}>
              桌遊
            </th>
            <th
              scope="col"
              className={cn(HEADER_CELL, "w-16 text-center sm:w-20 ")}
            >
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
              label="更新"
              query={query}
              className="hidden w-28 lg:table-cell"
            />
            <th scope="col" className={cn(HEADER_CELL, "w-10 sm:w-12")}>
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
              <td
                className={cn(
                  BODY_CELL,
                  "text-center font-mono text-xs whitespace-nowrap text-(--muted)",
                )}
              >
                {boardGame.inventory_number}
              </td>

              <td className={BODY_CELL}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <BoardGameImage
                    boardGame={boardGame}
                    className="size-8 shrink-0 rounded-md border border-(--border) object-cover md:size-10"
                  />
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

              <td className={cn(BODY_CELL, "text-center whitespace-nowrap")}>
                <BoardGameStatusBadge status={boardGame.status} />
              </td>
              <td
                className={cn(
                  BODY_CELL,
                  "hidden whitespace-nowrap text-(--muted) md:table-cell",
                )}
              >
                {boardGame.location.name}
              </td>
              <td
                className={cn(
                  BODY_CELL,
                  "hidden whitespace-nowrap text-(--muted) md:table-cell",
                )}
              >
                {boardGame.category.name}
              </td>
              <td
                className={cn(
                  BODY_CELL,
                  "hidden whitespace-nowrap text-(--muted) lg:table-cell",
                )}
              >
                {formatDate(boardGame.updated_at)}
              </td>
              <td className={cn(BODY_CELL, "text-center")}>
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
        className="inline-flex items-center justify-center gap-1 transition hover:text-(--foreground)"
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

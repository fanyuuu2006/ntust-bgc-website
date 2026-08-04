import Link from "next/link";
import { BoardGameActions } from "@/components/(admin)/admin/board-games/BoardGameActions";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/className";
import { buildQueryString } from "@/utils/url";
import { BoardGamesQueryState } from "@/app/(admin)/admin/board-games/types";

const BASE_PATH = "/admin/board-games";

type BoardGameTableProps = React.HTMLAttributes<HTMLDivElement> & {
  boardGames: BoardGameWithCategoryAndLocation[];
  query: BoardGamesQueryState;
};

/* ============================================================ *
 * BoardGameTable
 * ============================================================ */

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
      <table className="w-full min-w-180 text-left text-sm">
        <thead className="sticky top-0 z-1 bg-(--secondary-background)">
          <tr className="border-b border-(--border) text-(--muted)">
            <SortableHeader
              column="inventory_number"
              label="編號"
              query={query}
              className="w-24"
            />
            <th scope="col" className="px-4 py-3 font-medium">
              桌遊
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              分類
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              位置
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              狀態
            </th>
            <SortableHeader
              column="updated_at"
              label="更新"
              query={query}
              className="w-28"
            />
            <th scope="col" className="px-4 py-3 text-right font-medium">
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
              <td className="px-4 py-3 align-top font-mono text-xs whitespace-nowrap text-(--muted)">
                {boardGame.inventory_number}
              </td>

              <td className="px-4 py-3 align-top">
                <div className="flex items-start gap-3">
                  {boardGame.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={boardGame.image}
                      alt=""
                      className="size-8 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-(--foreground)">
                      {boardGame.name}
                    </p>
                    {boardGame.description && (
                      <p className="max-w-64 truncate text-xs text-(--muted)">
                        {boardGame.description}
                      </p>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 align-top whitespace-nowrap">
                {boardGame.category.name}
              </td>
              <td className="px-4 py-3 align-top whitespace-nowrap">
                {boardGame.location.name}
              </td>
              <td className="px-4 py-3 align-top whitespace-nowrap">
                <BoardGameStatusBadge status={boardGame.status} />
              </td>
              <td className="px-4 py-3 align-top whitespace-nowrap text-(--muted)">
                {formatDate(boardGame.updated_at)}
              </td>
              <td className="px-4 py-3 align-top">
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
  query: BoardGamesQueryState;
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
  console.log("query.orderDirection", query.orderDirection);
  console.log("nextDirection", nextDirection);
  const href = `${BASE_PATH}?${buildQueryString(query, {
    orderBy: column,
    orderDirection: nextDirection,
    page: 1,
  })}`;

  return (
    <th scope="col" className={cn("px-4 py-3 font-medium", className)}>
      <Link
        href={href}
        className="inline-flex items-center gap-1 transition hover:text-(--foreground)"
      >
        {label}
        {isActive && (
          <span aria-hidden="true">
            {query.orderDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </Link>
    </th>
  );
}

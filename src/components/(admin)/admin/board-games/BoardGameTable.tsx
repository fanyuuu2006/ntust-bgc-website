"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/app/(admin)/admin/board-games/constants";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { BoardGameImage } from "@/components/BoardGameImage";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import { formatDateTime } from "@/utils/date";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  boardGames: BoardGameWithCategoryAndLocation[];
  query: BoardGamesQuery;
  hasFilters?: boolean;
};

export function BoardGameTable({
  boardGames,
  query,
  hasFilters = false,
  className,
  ...props
}: Props) {
  const router = useRouter();
  const [selectedBoardGame, setSelectedBoardGame] =
    useState<BoardGameWithCategoryAndLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeDeleteDialog = () => {
    if (isDeleting) return;

    setSelectedBoardGame(null);
    setDeleteError(null);
  };

  const openDeleteDialog = (boardGame: BoardGameWithCategoryAndLocation) => {
    setSelectedBoardGame(boardGame);
    setDeleteError(null);
  };

  const removeBoardGame = async () => {
    if (!selectedBoardGame) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient(`/api/admin/board-games/${selectedBoardGame.id}`, {
        method: "DELETE",
      });
      setSelectedBoardGame(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "刪除桌遊失敗，請稍後再試。",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!boardGames.length) {
    if (hasFilters) {
      return (
        <QueryEmptyState
          className={className}
          title="找不到符合條件的桌遊"
          description="請調整搜尋或篩選條件後再試。"
          clearHref={BASE_PATH}
          {...props}
        />
      );
    }

    return (
      <EmptyState
        className={className}
        title="目前還沒有桌遊"
        description="可從頁面標題旁新增第一款桌遊。"
        {...props}
      />
    );
  }

  const headerQuery = toQuery(query);

  return (
    <div className={className} {...props}>
      <AdminListSection className="hidden xl:block">
        <Table className="min-w-250">
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                label="編號"
                column="inventory_number"
                basePath={BASE_PATH}
                query={headerQuery}
                className="whitespace-nowrap text-center"
              />
              <SortableTableHeader
                label="桌遊"
                column="name"
                basePath={BASE_PATH}
                query={headerQuery}
              />
              <TableHead className="whitespace-nowrap">狀態</TableHead>
              <TableHead className="whitespace-nowrap">位置</TableHead>
              <TableHead className="whitespace-nowrap">種類</TableHead>
              <SortableTableHeader
                label="更新時間"
                column="updated_at"
                basePath={BASE_PATH}
                query={headerQuery}
                className="whitespace-nowrap"
              />
              <TableHead className="whitespace-nowrap text-right">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boardGames.map((game) => (
              <TableRow key={game.id}>
                <TableCell className="whitespace-nowrap text-center font-mono">
                  {game.inventory_number}
                </TableCell>
                <TableCell className="min-w-72">
                  <div className="flex min-w-0 items-center gap-3">
                    <BoardGameImage
                      boardGame={game}
                      className="size-10 shrink-0 rounded-md border border-(--border) object-cover"
                    />
                    <span className="truncate font-medium">{game.name}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <BoardGameStatusBadge status={game.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {game.location.name}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {game.category.name}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(game.updated_at)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <BoardGameRowActions
                    boardGame={game}
                    onDelete={openDeleteDialog}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminListSection>

      <div className="grid min-w-0 max-w-full gap-3 xl:hidden">
        {boardGames.map((game) => (
          <Card
            key={game.id}
            className="w-full min-w-0 max-w-full space-y-3 p-4"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <BoardGameImage
                  boardGame={game}
                  className="size-12 shrink-0 rounded-md border border-(--border) object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{game.name}</h2>
                  <p className="mt-1 text-sm text-(--muted)">
                    社產編號 #{game.inventory_number}
                  </p>
                  <p className="mt-1 text-sm text-(--muted)">
                    {game.category.name} · {game.location.name}
                  </p>
                </div>
              </div>
              <span className="shrink-0 self-start whitespace-nowrap">
                <BoardGameStatusBadge status={game.status} />
              </span>
            </div>
            <p className="text-xs text-(--muted)">
              更新：{formatDateTime(game.updated_at)}
            </p>
            <BoardGameRowActions boardGame={game} onDelete={openDeleteDialog} />
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={selectedBoardGame !== null}
        onClose={closeDeleteDialog}
        onConfirm={removeBoardGame}
        isSubmitting={isDeleting}
        title="刪除桌遊"
        description={
          selectedBoardGame
            ? `確定要刪除「${selectedBoardGame.name}」嗎？若仍有未結束的借用流程，系統會拒絕刪除。${deleteError ? ` ${deleteError}` : ""}`
            : ""
        }
      />
    </div>
  );
}

function BoardGameRowActions({
  boardGame,
  onDelete,
}: {
  boardGame: BoardGameWithCategoryAndLocation;
  onDelete: (boardGame: BoardGameWithCategoryAndLocation) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ButtonLink
        href={`/admin/board-games/${boardGame.id}/edit`}
        variant="outline"
        size="sm"
        className="rounded-lg"
      >
        編輯
      </ButtonLink>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="rounded-lg"
        onClick={() => onDelete(boardGame)}
      >
        刪除
      </Button>
    </div>
  );
}

function toQuery(
  query: BoardGamesQuery,
): Record<string, string | string[] | undefined> {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value
        : value === undefined
          ? undefined
          : String(value),
    ]),
  );
}

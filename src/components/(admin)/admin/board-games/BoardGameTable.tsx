"use client";

import { buildAdminListHref, buildAdminReturnHref } from "@/utils/admin-return";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/app/(admin)/admin/board-games/constants";
import { AdminBoardGameLink } from "@/components/(admin)/admin/AdminBoardGameLink";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminBulkActionBar } from "@/components/(admin)/admin/AdminBulkActionBar";
import { AdminMobileBulkModeButton } from "@/components/(admin)/admin/AdminMobileBulkModeButton";
import { AdminSelectionCheckbox } from "@/components/(admin)/admin/AdminSelectionCheckbox";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { BoardGameImage } from "@/components/BoardGameImage";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import { useToast } from "@/contexts/ToastContext";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import type { BoardGameCategory, BoardGameLocation } from "@/types/database";
import { formatDateTime } from "@/utils/date";
import { useCurrentPageSelection } from "@/hooks/useCurrentPageSelection";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  boardGames: BoardGameWithCategoryAndLocation[];
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
  hasFilters?: boolean;
};

export function BoardGameTable({
  boardGames,
  categories,
  locations,
  query,
  hasFilters = false,
  className,
  ...props
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const returnTo = buildAdminListHref(BASE_PATH, query);
  const [selectedBoardGame, setSelectedBoardGame] =
    useState<BoardGameWithCategoryAndLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [mobileBulkMode, setMobileBulkMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<"set-category" | "set-location">("set-category");
  const [bulkTargetId, setBulkTargetId] = useState(categories[0]?.id ?? "");
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const {
    selectedIds,
    selectedCount,
    allSelected,
    partiallySelected,
    setItemSelected: setGameSelected,
    setCurrentPageSelected,
    clearSelection,
  } = useCurrentPageSelection(boardGames.map((game) => game.id));
  const selectedGames = boardGames.filter((game) => selectedIds.has(game.id));
  const isMutating = isDeleting || isBulkUpdating;
  const targets = bulkAction === "set-category" ? categories : locations;
  const target = targets.find((item) => item.id === bulkTargetId);

  const changeBulkAction = (action: "set-category" | "set-location") => {
    setBulkAction(action);
    setBulkTargetId((action === "set-category" ? categories : locations)[0]?.id ?? "");
  };
  const bulkUpdate = async () => {
    if (!selectedCount || !bulkTargetId) return;
    setIsBulkUpdating(true); setBulkFeedback(null);
    try {
      const response = await apiClient<{ data: { updatedCount: number } }>("/api/admin/board-games/batch", {
        method: "PATCH",
        body: { action: bulkAction, target_id: bulkTargetId, records: selectedGames.map((game) => ({ id: game.id, expected_updated_at: game.updated_at })) },
      });
      clearSelection(); setIsBulkDialogOpen(false);
      setBulkFeedback({ tone: "success", message: `已更新 ${response.data.updatedCount} 筆桌遊` });
      router.refresh();
      showToast("success", `已更新 ${response.data.updatedCount} 款桌遊`);
    } catch (error) {
      setIsBulkDialogOpen(false);
      setBulkFeedback({ tone: "error", message: error instanceof Error ? error.message : "批次更新桌遊失敗，請稍後再試" });
    } finally { setIsBulkUpdating(false); }
  };

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
      showToast("success", "桌遊已刪除");
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
      {bulkFeedback ? <FormFeedback error={bulkFeedback.tone === "error" ? bulkFeedback.message : null} success={bulkFeedback.tone === "success" ? bulkFeedback.message : null} className="mb-3" /> : null}
      <AdminMobileBulkModeButton active={mobileBulkMode} disabled={isMutating} selectedCount={selectedCount} selectionControl={<div className="flex items-center gap-1 text-sm"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isMutating} onCheckedChange={setCurrentPageSelected} label="選取目前頁面的所有桌遊" />全選本頁</div>} className="mb-2 xl:hidden" onChange={(active) => { setMobileBulkMode(active); if (!active) clearSelection(); }} />
      {selectedCount > 0 ? (
        <AdminBulkActionBar
          className="mb-3"
          selectedCount={selectedCount}
          disabled={isMutating}
          mobilePresentation="panel"
          desktopBreakpoint="xl"
          onClear={() => { clearSelection(); setMobileBulkMode(false); }}
        >
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-(--text-primary) xl:block">
            <span className="xl:sr-only">操作</span>
            <Select aria-label="批次操作" value={bulkAction} disabled={isMutating} onChange={(event) => changeBulkAction(event.target.value as "set-category" | "set-location")} className="w-full xl:w-auto"><option value="set-category">變更種類</option><option value="set-location">變更位置</option></Select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-(--text-primary) xl:block">
            <span className="xl:sr-only">目標</span>
            <Select aria-label={bulkAction === "set-category" ? "目標桌遊種類" : "目標桌遊位置"} value={bulkTargetId} disabled={isMutating} onChange={(event) => setBulkTargetId(event.target.value)} className="w-full xl:max-w-48"><option value="">請選擇</option>{targets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          </label>
          <Button size="sm" className="w-full xl:w-auto" disabled={isMutating || !bulkTargetId} onClick={() => setIsBulkDialogOpen(true)}><span className="xl:hidden">套用變更</span><span className="hidden xl:inline">套用</span></Button>
        </AdminBulkActionBar>
      ) : null}
      <AdminListSection className="hidden xl:block">
        <Table className="min-w-[1040px] table-fixed">
          <colgroup>
            <col className="w-12" />
            <col className="w-20" />
            <col className="w-72" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-40" />
            <col className="w-40" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isMutating} onCheckedChange={setCurrentPageSelected} label="選取目前頁面的所有桌遊" /></TableHead>
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
                <TableCell className="w-12"><AdminSelectionCheckbox checked={selectedIds.has(game.id)} disabled={isMutating} onCheckedChange={(checked) => setGameSelected(game.id, checked)} label={`選取桌遊 ${game.name}`} /></TableCell>
                <TableCell className="whitespace-nowrap text-center font-mono">
                  {game.inventory_number}
                </TableCell>
                <TableCell className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <BoardGameImage
                      boardGame={game}
                      className="size-10 shrink-0 rounded-md border border-(--border) object-cover"
                    />
                    <AdminBoardGameLink
                      boardGameId={game.id}
                      returnTo={returnTo}
                      className="min-w-0 line-clamp-2"
                      title={game.name}
                    >
                      {game.name}
                    </AdminBoardGameLink>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <BoardGameStatusBadge status={game.status} />
                </TableCell>
                <TableCell className="max-w-48 wrap-anywhere">
                  {game.location.name}
                </TableCell>
                <TableCell className="max-w-48 wrap-anywhere">
                  {game.category.name}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(game.updated_at)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <BoardGameRowActions
                    boardGame={game}
                    onDelete={openDeleteDialog} returnTo={returnTo}
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
            className="w-full min-w-0 max-w-full space-y-2.5 p-3 sm:p-4"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {mobileBulkMode ? <AdminSelectionCheckbox checked={selectedIds.has(game.id)} disabled={isMutating} onCheckedChange={(checked) => setGameSelected(game.id, checked)} label={`選取桌遊 ${game.name}`} containerClassName="-mt-1 -ml-1" /> : null}
                <BoardGameImage
                  boardGame={game}
                  className="size-12 shrink-0 rounded-md border border-(--border) object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="wrap-anywhere font-semibold">
                    <AdminBoardGameLink boardGameId={game.id} returnTo={returnTo}>
                      {game.name}
                    </AdminBoardGameLink>
                  </h2>
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
            {!mobileBulkMode ? (
              <div className="border-t border-(--border-muted) pt-3">
                <BoardGameRowActions boardGame={game} onDelete={openDeleteDialog} returnTo={returnTo} />
              </div>
            ) : null}
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
      <ConfirmDialog open={isBulkDialogOpen} onClose={() => !isBulkUpdating && setIsBulkDialogOpen(false)} onConfirm={bulkUpdate} isSubmitting={isBulkUpdating} title={bulkAction === "set-category" ? "批次變更桌遊種類" : "批次變更桌遊位置"} description={`確定要將已選取的 ${selectedCount} 筆桌遊${bulkAction === "set-category" ? "種類" : "位置"}變更為「${target?.name ?? "未選擇"}」嗎？`} confirmLabel="套用變更" />
    </div>
  );
}

function BoardGameRowActions({
  boardGame,
  onDelete,
  returnTo,
}: {
  boardGame: BoardGameWithCategoryAndLocation;
  returnTo: string;
  onDelete: (boardGame: BoardGameWithCategoryAndLocation) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ButtonLink
        href={buildAdminReturnHref(`/admin/board-games/${boardGame.id}/edit`, returnTo, BASE_PATH)}
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

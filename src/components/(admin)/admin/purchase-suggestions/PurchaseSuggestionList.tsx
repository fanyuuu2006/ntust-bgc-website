"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminBulkActionBar } from "@/components/(admin)/admin/AdminBulkActionBar";
import { AdminMobileBulkModeButton } from "@/components/(admin)/admin/AdminMobileBulkModeButton";
import { AdminSelectionCheckbox } from "@/components/(admin)/admin/AdminSelectionCheckbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { PurchaseSuggestionActions } from "./PurchaseSuggestionActions";
import { referenceUrlSchema } from "@/services/purchase-suggestions/purchase-suggestions.schema";
import type { AdminPurchaseSuggestionItem } from "@/services/purchase-suggestions/purchase-suggestions.types";
import { PURCHASE_SUGGESTION_STATUS_LABELS } from "@/utils/purchase-suggestions";
import { formatAdminDateTime } from "@/utils/date";
import { useCurrentPageSelection } from "@/hooks/useCurrentPageSelection";
function Status({ item }: {
  item: AdminPurchaseSuggestionItem;
}) {
  return <Badge tone={item.status === "purchased" ? "info" : item.status === "pending" ? "warning" : "neutral"}>{PURCHASE_SUGGESTION_STATUS_LABELS[item.status]}</Badge>;
}
function Content({ item, showName = true }: {
  item: AdminPurchaseSuggestionItem;
  showName?: boolean;
}) {
  const parsed = referenceUrlSchema.safeParse(item.reference_url ?? "");
  const url = parsed.success ? parsed.data : null;
  return <div className="min-w-0 max-w-full space-y-1 wrap-anywhere">
    {showName ? <p className="min-w-0 font-semibold text-(--text-primary)">{item.game_name}</p> : null}
    <p className="min-w-0 whitespace-pre-wrap text-xs leading-5 text-(--text-muted)">{item.reason}</p>
    {url ? <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block max-w-full break-all text-sm text-(--action) underline underline-offset-4"
    >參考連結：{new URL(url).hostname}（外部網站）</a> : null}
  </div>;
}
function Time({ item }: {
  item: AdminPurchaseSuggestionItem;
}) {
  return <div className="space-y-1 text-sm">
    <p className="text-xs text-(--text-muted)">提交時間</p>
    <p>{formatAdminDateTime(item.created_at)}</p>
    {item.reviewed_at ? <p className="text-xs text-(--text-muted)">處理：{formatAdminDateTime(item.reviewed_at)}</p> : null}
    {item.reviewed_by_user_id ? <p className="wrap-anywhere text-xs text-(--text-muted)">處理：{item.reviewed_by_name || "尚未記錄處理人"}</p> : null}
  </div>;
}
export function PurchaseSuggestionList({ items, hasQuery = false }: {
  items: AdminPurchaseSuggestionItem[];
  hasQuery?: boolean;
}) {
  const router = useRouter();
  const [mobileBulkMode, setMobileBulkMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<"purchased" | "rejected" | "delete">("purchased");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const {
    selectedIds,
    selectedCount,
    allSelected,
    partiallySelected,
    setItemSelected: setSelected,
    setCurrentPageSelected,
    clearSelection,
  } = useCurrentPageSelection(items.map((item) => item.id));
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const canApply = selectedCount > 0 && (bulkAction === "delete" || selectedItems.every((item) => item.status !== bulkAction));
  const mobileReviewAction = bulkAction === "delete" ? "purchased" : bulkAction;
  const canApplyMobileReview = selectedItems.length > 0 && selectedItems.every(
    (item) => item.status !== mobileReviewAction,
  );

  const applyBulkAction = async () => {
    if (!canApply) return;
    setIsUpdating(true);
    setFeedback(null);
    try {
      const response = await apiClient<{ data: { updatedCount: number } }>(
        "/api/admin/board-games/suggests/batch",
        { method: "PATCH", body: { action: bulkAction, records: selectedItems.map(({ id, version }) => ({ id, version })) } },
      );
      clearSelection();
      setIsConfirmOpen(false);
      setFeedback({ tone: "success", message: `已更新 ${response.data.updatedCount} 筆推薦。` });
      router.refresh();
    } catch (error) {
      setIsConfirmOpen(false);
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "批次處理失敗，請稍後再試。" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!items.length)
    return hasQuery
      ? <QueryEmptyState
        title="沒有符合條件的推薦"
        description="調整搜尋或篩選條件後再試試看。"
        clearHref="/admin/board-games/suggests?status=all"
      />
      : <EmptyState title="目前沒有桌遊推薦" />;
  return <>
    {feedback ? <FormFeedback error={feedback.tone === "error" ? feedback.message : null} success={feedback.tone === "success" ? feedback.message : null} /> : null}
    <AdminMobileBulkModeButton active={mobileBulkMode} disabled={isUpdating} selectedCount={selectedCount} selectionControl={<div className="flex items-center gap-1 text-sm"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isUpdating} onCheckedChange={setCurrentPageSelected} label="選取本頁全部推薦" />全選本頁</div>} onChange={(active) => { setMobileBulkMode(active); if (!active) clearSelection(); }} />
    {selectedCount > 0 ? <AdminBulkActionBar
      selectedCount={selectedCount}
      disabled={isUpdating}
      mobilePresentation="panel"
      mobileActions={
        <>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-(--text-primary)">
            審核結果
            <Select
              aria-label="批次審核推薦"
              value={mobileReviewAction}
              disabled={isUpdating}
              onChange={(event) => setBulkAction(event.target.value as "purchased" | "rejected")}
              className="w-full"
            >
              <option value="purchased">標記已購入</option>
              <option value="rejected">標記不採納</option>
            </Select>
          </label>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isUpdating || !canApplyMobileReview}
              onClick={() => { setBulkAction(mobileReviewAction); setIsConfirmOpen(true); }}
            >
              套用狀態
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={isUpdating}
              onClick={() => { setBulkAction("delete"); setIsConfirmOpen(true); }}
            >
              刪除推薦
            </Button>
          </div>
        </>
      }
      onClear={() => { clearSelection(); setMobileBulkMode(false); }}
      notice={!canApply ? "選取內容包含已是目標狀態的推薦；請取消該項目或改選另一個動作。" : undefined}
      mobileNotice={!canApplyMobileReview ? "選取內容包含已是目標狀態的推薦；請取消該項目或改選另一個動作。" : undefined}
    >
      <Select aria-label="批次處理推薦" value={bulkAction} disabled={isUpdating} onChange={(event) => setBulkAction(event.target.value as "purchased" | "rejected" | "delete")} className="w-auto"><option value="purchased">標記已購入</option><option value="rejected">標記不採納</option><option value="delete">刪除推薦</option></Select>
      <Button size="sm" variant={bulkAction === "delete" ? "danger" : "primary"} disabled={isUpdating || !canApply} onClick={() => setIsConfirmOpen(true)}>套用</Button>
    </AdminBulkActionBar> : null}
    <AdminListSection className="hidden lg:block">
      <Table className="min-w-190">
        <TableHeader><TableRow>
          <TableHead className="w-12"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isUpdating} onCheckedChange={setCurrentPageSelected} label="選取本頁全部推薦" /></TableHead><TableHead>桌遊與推薦理由</TableHead><TableHead>狀態</TableHead><TableHead>時間</TableHead><TableHead className="text-right">操作</TableHead>
        </TableRow></TableHeader>
        <TableBody>{items.map((item) => <TableRow key={item.id}>
          <TableCell><AdminSelectionCheckbox checked={selectedIds.has(item.id)} disabled={isUpdating} onCheckedChange={(checked) => setSelected(item.id, checked)} label={`選取桌遊推薦 ${item.game_name}`} /></TableCell>
          <TableCell className="min-w-64 max-w-lg"><Content item={item} /></TableCell>
          <TableCell className="whitespace-nowrap"><Status item={item} /></TableCell>
          <TableCell className="min-w-44"><Time item={item} /></TableCell>
          <TableCell className="min-w-56 text-right"><PurchaseSuggestionActions
            id={item.id}
            version={item.version}
            status={item.status}
          /></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </AdminListSection>
    <div className="grid min-w-0 max-w-full gap-2.5 lg:hidden">{items.map((item) => <Card key={item.id} className="w-full min-w-0 max-w-full space-y-2.5 p-3 sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">{mobileBulkMode ? <AdminSelectionCheckbox checked={selectedIds.has(item.id)} disabled={isUpdating} onCheckedChange={(checked) => setSelected(item.id, checked)} label={`選取桌遊推薦 ${item.game_name}`} containerClassName="-mt-1 -ml-1" /> : null}<p className="min-w-0 flex-1 wrap-anywhere font-semibold text-(--text-primary)">{item.game_name}</p></div>
        <Status item={item} />
      </div>
      <Content item={item} showName={false} /><Time item={item} />
      <PurchaseSuggestionActions
        id={item.id}
        version={item.version}
        status={item.status}
      />
    </Card>)}</div>
    <ConfirmDialog open={isConfirmOpen} onClose={() => !isUpdating && setIsConfirmOpen(false)} onConfirm={applyBulkAction} isSubmitting={isUpdating} title={bulkAction === "delete" ? "批次刪除推薦" : bulkAction === "purchased" ? "批次標記已購入" : "批次標記不採納"} description={bulkAction === "delete" ? `確定要刪除已選取的 ${selectedCount} 筆推薦嗎？推薦會從管理清單隱藏，介面無法復原；系統仍保留必要紀錄以維持額度與重複提交防護。` : `確定要將已選取的 ${selectedCount} 筆推薦標記為「${bulkAction === "purchased" ? "已購入" : "不採納"}」嗎？系統會重新檢查每筆版本，任一筆已變更時將不會更新任何資料。`} confirmLabel={bulkAction === "delete" ? "確認刪除" : "確認更新"} confirmVariant={bulkAction === "delete" ? "danger" : "primary"} />
  </>;
}

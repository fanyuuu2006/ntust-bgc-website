"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminBoardGameLink } from "@/components/(admin)/admin/AdminBoardGameLink";
import { AdminBulkActionBar } from "@/components/(admin)/admin/AdminBulkActionBar";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminMobileBulkModeButton } from "@/components/(admin)/admin/AdminMobileBulkModeButton";
import { AdminSelectionCheckbox } from "@/components/(admin)/admin/AdminSelectionCheckbox";
import { AdminUserLink } from "@/components/(admin)/admin/users/AdminUserLink";
import {
  BorrowingActionDialog,
  type BorrowingLifecycleAction,
} from "@/components/(admin)/admin/borrowings/BorrowingActionDialog";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import { useCurrentPageSelection } from "@/hooks/useCurrentPageSelection";
import { borrowingConfig } from "@/libs/borrowingConfig";
import type { BoardGameBorrowingForAdmin } from "@/services/board-games/board-games.types";
import {
  formatAdminDateTime,
  formatTaipeiDateTimeLocal,
  getFutureTaipeiDateTimeLocal,
  parseTaipeiDateTimeLocal,
} from "@/utils/date";

type Action = "approve" | "reject" | "checkout" | "return" | "edit";
type BulkAction = BorrowingLifecycleAction;

const BASE_PATH = "/admin/board-games/borrowings";

export function AdminBorrowingList({
  borrowings,
  hasQuery,
}: {
  borrowings: BoardGameBorrowingForAdmin[];
  hasQuery: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<{
    borrowing: BoardGameBorrowingForAdmin;
    action: Action;
  } | null>(null);
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mobileBulkMode, setMobileBulkMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkDueAt, setBulkDueAt] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const eligibleBorrowings = borrowings.filter(
    (borrowing) => ["pending", "approved", "borrowed"].includes(borrowing.status),
  );
  const {
    selectedIds, selectedCount, allSelected, partiallySelected,
    setItemSelected, setCurrentPageSelected, clearSelection,
  } = useCurrentPageSelection(eligibleBorrowings.map((borrowing) => borrowing.id));
  const selectedBorrowings = eligibleBorrowings.filter((borrowing) => selectedIds.has(borrowing.id));
  const selectedStatuses = new Set(selectedBorrowings.map((borrowing) => borrowing.status));
  const firstSelectedStatus = selectedBorrowings[0]?.status;
  const selectedStatus = selectedStatuses.size === 1 &&
    (firstSelectedStatus === "pending" || firstSelectedStatus === "approved" || firstSelectedStatus === "borrowed")
    ? firstSelectedStatus
    : null;
  const isMutating = busy || bulkBusy;

  function choose(borrowing: BoardGameBorrowingForAdmin, action: Action) {
    setDueAt(
      action === "checkout"
        ? getFutureTaipeiDateTimeLocal(borrowingConfig.defaultDurationDays)
        : action === "edit" && borrowing.due_at
          ? formatTaipeiDateTimeLocal(new Date(borrowing.due_at))
          : "",
    );
    setFeedback(null);
    setSelected({ borrowing, action });
  }

  function close() {
    if (!busy) {
      setSelected(null);
      setFeedback(null);
    }
  }

  function closeBulkAction() {
    if (!bulkBusy) {
      setBulkAction(null);
      setFeedback(null);
    }
  }

  async function run() {
    if (!selected || busy) return;

    const editedDueAt =
      selected.action === "checkout" || selected.action === "edit"
        ? parseTaipeiDateTimeLocal(dueAt)
        : null;
    if (
      (selected.action === "checkout" || selected.action === "edit") &&
      !editedDueAt
    ) {
      setFeedback("請輸入有效的預計歸還時間。");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await apiClient(`/api/admin/borrowings/${selected.borrowing.id}`, {
        method: "PATCH",
        body:
          selected.action === "edit"
            ? { due_at: editedDueAt }
            : {
                action: selected.action,
                ...(selected.action === "checkout"
                  ? { due_at: editedDueAt }
                  : {}),
              },
      });
      setSelected(null);
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "操作失敗，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runBulkAction() {
    if (!bulkAction || selectedBorrowings.length === 0 || bulkBusy) return;
    const parsedBulkDueAt = bulkAction === "borrow"
      ? parseTaipeiDateTimeLocal(bulkDueAt)
      : null;
    if (
      bulkAction === "borrow" &&
      (!parsedBulkDueAt || new Date(parsedBulkDueAt) <= new Date())
    ) {
      setFeedback("請輸入有效且晚於目前時間的預計歸還時間。");
      return;
    }
    setBulkBusy(true);
    setFeedback(null);
    setSuccess(null);
    try {
      const response = await apiClient<{ data: { updatedCount: number } }>(
        "/api/admin/borrowings/batch",
        {
          method: "PATCH",
          body: {
            action: bulkAction,
            ...(bulkAction === "borrow" ? { due_at: parsedBulkDueAt } : {}),
            records: selectedBorrowings.map((borrowing) => ({
              id: borrowing.id,
              expected_status: borrowing.status,
              expected_board_game_id: borrowing.board_game_id,
              expected_board_game_status: borrowing.board_game.status,
            })),
          },
        },
      );
      clearSelection();
      setBulkAction(null);
      setSuccess(`已完成 ${response.data.updatedCount} 筆借用紀錄的批次${bulkActionLabels[bulkAction]}。`);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "批次更新借用紀錄失敗，請稍後再試。");
    } finally {
      setBulkBusy(false);
    }
  }

  function openBulkAction(action: BulkAction) {
    setFeedback(null);
    setSuccess(null);
    setBulkDueAt(
      action === "borrow"
        ? getFutureTaipeiDateTimeLocal(borrowingConfig.defaultDurationDays)
        : "",
    );
    setBulkAction(action);
  }

  const selectedLifecycleAction: BorrowingLifecycleAction =
    selected?.action === "checkout"
      ? "borrow"
      : selected?.action === "approve" ||
          selected?.action === "reject" ||
          selected?.action === "return"
        ? selected.action
        : "approve";

  return (
    <div className="space-y-4">
      <FormFeedback success={success} />

      {eligibleBorrowings.length > 0 ? (
        <AdminMobileBulkModeButton active={mobileBulkMode} disabled={isMutating} selectedCount={selectedCount} selectionControl={<div className="flex items-center gap-1 text-sm"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isMutating} onCheckedChange={setCurrentPageSelected} label="選取目前頁面所有可批次操作的借用紀錄" />全選本頁</div>} onChange={(active) => { setMobileBulkMode(active); if (!active) clearSelection(); }} />
      ) : null}

      {selectedCount > 0 ? (
        <AdminBulkActionBar selectedCount={selectedCount} disabled={isMutating} onClear={clearSelection} selectionControl={<AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isMutating} onCheckedChange={setCurrentPageSelected} label="選取目前頁面所有可批次操作的借用紀錄" />} notice={selectedStatuses.size > 1 ? "請選取相同狀態的借用紀錄。" : undefined} mobilePresentation="panel" mobileActionLabel="批次操作" mobileActions={<BulkActionButtons status={selectedStatus} disabled={isMutating} onAction={openBulkAction} />}>
          <BulkActionButtons status={selectedStatus} disabled={isMutating} onAction={openBulkAction} />
        </AdminBulkActionBar>
      ) : null}

      {borrowings.length === 0 && hasQuery ? (
        <QueryEmptyState
          title="沒有符合條件的借用紀錄"
          description="調整搜尋或篩選條件後再試試看。"
          clearHref={BASE_PATH}
        />
      ) : borrowings.length === 0 ? (
        <EmptyState
          title="目前沒有借用紀錄"
        />
      ) : (
        <>
          <AdminListSection className="hidden lg:block">
            <Table className="min-w-190">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isMutating || eligibleBorrowings.length === 0} onCheckedChange={setCurrentPageSelected} label="選取目前頁面所有可批次操作的借用紀錄" /></TableHead>
                  <TableHead>桌遊</TableHead>
                  <TableHead>借用人</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowings.map((borrowing) => (
                  <TableRow key={borrowing.id}>
                    <TableCell><AdminSelectionCheckbox checked={selectedIds.has(borrowing.id)} disabled={isMutating || !["pending", "approved", "borrowed"].includes(borrowing.status)} onCheckedChange={(checked) => setItemSelected(borrowing.id, checked)} label={`選取 ${borrowing.board_game.name} 的借用紀錄`} /></TableCell>
                    <TableCell className="min-w-56 max-w-80">
                      <BoardGameSummary borrowing={borrowing} />
                    </TableCell>
                    <TableCell className="min-w-56">
                      <BorrowerSummary borrowing={borrowing} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <BorrowingStatusBadge status={borrowing.status} />
                    </TableCell>
                    <TableCell className="min-w-52">
                      <BorrowingTimeline borrowing={borrowing} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <BorrowingActions
                        borrowing={borrowing}
                        onAction={choose}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminListSection>

          <div className="grid min-w-0 max-w-full gap-2.5 lg:hidden">
            {borrowings.map((borrowing) => (
              <Card
                key={borrowing.id}
                className="w-full min-w-0 max-w-full space-y-2.5 p-3 sm:p-4"
              >
                {mobileBulkMode ? <div className="flex justify-end"><AdminSelectionCheckbox checked={selectedIds.has(borrowing.id)} disabled={isMutating || !["pending", "approved", "borrowed"].includes(borrowing.status)} onCheckedChange={(checked) => setItemSelected(borrowing.id, checked)} label={`選取 ${borrowing.board_game.name} 的借用紀錄`} /></div> : null}
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <BoardGameSummary
                    borrowing={borrowing}
                    titleClassName="wrap-anywhere"
                  />
                  <BorrowingStatusBadge
                    status={borrowing.status}
                    className="shrink-0"
                  />
                </div>
                <div className="border-t border-(--border-muted) pt-3">
                  <BorrowerSummary borrowing={borrowing} />
                </div>
                <MobileBorrowingMetadata borrowing={borrowing} />
                {!mobileBulkMode ? <div className="border-t border-(--border-muted) pt-3"><BorrowingActions borrowing={borrowing} onAction={choose} /></div> : null}
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={selected?.action === "edit"}
        onClose={close}
        title="編輯借用紀錄"
        description={selected ? `桌遊「${selected.borrowing.board_game.name}」的借用。` : ""}
      >
        <div className="space-y-4">
          <Field label="預計歸還時間（台北時間）" htmlFor="borrowing-due-at" required>
            <Input
              id="borrowing-due-at"
              required
              aria-required="true"
              autoFocus
              className="w-full"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </Field>
          <p className="text-sm leading-6 text-(--text-muted)">
            僅能調整借出中的預計歸還時間。
          </p>
          <FormFeedback error={feedback} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={busy}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={run}
              disabled={busy}
              isLoading={busy}
            >
              儲存變更
            </Button>
          </div>
        </div>
      </Modal>

      <BorrowingActionDialog
        open={Boolean(selected && selected.action !== "edit")}
        items={selected ? [selected.borrowing] : []}
        action={selectedLifecycleAction}
        mode="single"
        dueAt={dueAt}
        error={feedback}
        isSubmitting={busy}
        onDueAtChange={setDueAt}
        onClose={close}
        onConfirm={run}
      />
      <BorrowingActionDialog
        open={bulkAction !== null}
        items={selectedBorrowings}
        action={bulkAction ?? "approve"}
        mode="batch"
        dueAt={bulkDueAt}
        error={feedback}
        isSubmitting={bulkBusy}
        onDueAtChange={setBulkDueAt}
        onClose={closeBulkAction}
        onConfirm={runBulkAction}
      />
    </div>
  );
}

const bulkActionLabels: Record<BulkAction, string> = { approve: "核准", reject: "拒絕", borrow: "確認借出", return: "歸還" };

function BulkActionButtons({ status, disabled, onAction }: { status: "pending" | "approved" | "borrowed" | null | undefined; disabled: boolean; onAction: (action: BulkAction) => void }) {
  if (status === "pending") return <div className="flex min-w-0 flex-wrap gap-2"><Button size="sm" disabled={disabled} onClick={() => onAction("approve")}>批次核准</Button><Button size="sm" variant="danger" disabled={disabled} onClick={() => onAction("reject")}>批次拒絕</Button></div>;
  if (status === "approved") return <Button size="sm" disabled={disabled} onClick={() => onAction("borrow")}>批次確認借出</Button>;
  if (status === "borrowed") return <Button size="sm" disabled={disabled} onClick={() => onAction("return")}>批次歸還</Button>;
  return null;
}


function BorrowingActions({
  borrowing,
  onAction,
}: {
  borrowing: BoardGameBorrowingForAdmin;
  onAction: (borrowing: BoardGameBorrowingForAdmin, action: Action) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2 md:justify-end">
      {borrowing.status === "pending" ? (
        <>
          <Button size="sm" onClick={() => onAction(borrowing, "approve")}>
            核准借用
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onAction(borrowing, "reject")}
          >
            拒絕申請
          </Button>
        </>
      ) : null}
      {borrowing.status === "approved" ? (
        <Button size="sm" onClick={() => onAction(borrowing, "checkout")}>
          確認借出
        </Button>
      ) : null}
      {borrowing.status === "borrowed" ? (
        <Button size="sm" onClick={() => onAction(borrowing, "return")}>
          確認歸還
        </Button>
      ) : null}
      {borrowing.status === "borrowed" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction(borrowing, "edit")}
        >
          編輯
        </Button>
      ) : null}
    </div>
  );
}

function BoardGameSummary({
  borrowing,
  titleClassName = "wrap-anywhere",
}: {
  borrowing: BoardGameBorrowingForAdmin;
  titleClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <AdminBoardGameLink
        boardGameId={borrowing.board_game.id}
        className={`${titleClassName} font-medium text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)`}
      >
        {borrowing.board_game.name}
      </AdminBoardGameLink>
      <p className="mt-1 text-xs text-(--text-muted)">
        社產編號 #
        {borrowing.board_game.inventory_number}
      </p>
    </div>
  );
}

function BorrowerSummary({
  borrowing,
}: {
  borrowing: BoardGameBorrowingForAdmin;
}) {
  return (
    <div className="min-w-0">
      <AdminUserLink
        userId={borrowing.user.id}
        identity={{
          ...borrowing.user,
          real_name: borrowing.user_profile?.real_name ?? null,
          student_id: borrowing.user_profile?.student_id ?? null,
        }}
        disambiguation="email"
      />
      <div className="mt-1">
        <BorrowerMembershipContext borrowing={borrowing} />
      </div>
    </div>
  );
}

function BorrowerMembershipContext({
  borrowing,
}: {
  borrowing: BoardGameBorrowingForAdmin;
}) {
  return (
    <Badge
      tone={borrowing.is_current_academic_year_member ? "success" : "info"}
    >
      {borrowing.is_current_academic_year_member
        ? "本學年度社員"
        : "非本學年度社員"}
    </Badge>
  );
}

function BorrowingTimeline({
  borrowing,
}: {
  borrowing: BoardGameBorrowingForAdmin;
}) {
  const actorLine = getApprovalActorLine(borrowing);
  if (borrowing.status === "borrowed") {
    return (
      <Timeline
        label="預計歸還"
        value={formatOptionalDate(borrowing.due_at)}
        details={[
          borrowing.approved_at
            ? `核准：${formatAdminDateTime(borrowing.approved_at)}`
            : undefined,
          borrowing.borrowed_at
            ? `借出：${formatAdminDateTime(borrowing.borrowed_at)}`
            : undefined,
          actorLine,
        ]}
      />
    );
  }
  if (borrowing.status === "returned") {
    return (
      <Timeline
        label="已歸還"
        value={formatOptionalDate(borrowing.returned_at)}
        details={[
          borrowing.approved_at
            ? `核准：${formatAdminDateTime(borrowing.approved_at)}`
            : undefined,
          borrowing.borrowed_at
            ? `借出：${formatAdminDateTime(borrowing.borrowed_at)}`
            : undefined,
          actorLine,
        ]}
      />
    );
  }
  if (borrowing.status === "approved") {
    return (
      <Timeline
        label="核准時間"
        value={borrowing.approved_at ? formatAdminDateTime(borrowing.approved_at) : formatAdminDateTime(borrowing.created_at)}
        details={[borrowing.approved_at ? `申請：${formatAdminDateTime(borrowing.created_at)}` : undefined, actorLine, "等待確認借出"]}
      />
    );
  }
  if (borrowing.status === "rejected") {
    return (
      <Timeline
        label={borrowing.rejected_at ? "拒絕時間" : "申請時間"}
        value={formatAdminDateTime(borrowing.rejected_at ?? borrowing.created_at)}
        details={[borrowing.rejected_at ? `申請：${formatAdminDateTime(borrowing.created_at)}` : undefined, actorLine]}
      />
    );
  }
  if (borrowing.status === "cancelled") {
    return (
      <Timeline
        label={borrowing.cancelled_at ? "取消時間" : "申請時間"}
        value={formatAdminDateTime(borrowing.cancelled_at ?? borrowing.created_at)}
        details={[borrowing.cancelled_at ? `申請：${formatAdminDateTime(borrowing.created_at)}` : undefined]}
      />
    );
  }
  return (
    <Timeline
      label="申請時間"
      value={formatAdminDateTime(borrowing.created_at)}
    />
  );
}

function Timeline({
  label,
  value,
  details = [],
}: {
  label: string;
  value: string;
  details?: Array<string | undefined>;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-(--text-muted)">{label}</p>
      <p className="mt-0.5 wrap-anywhere text-sm text-(--text-primary)">
        {value}
      </p>
      {details.filter(Boolean).map((detail) => (
        <p key={detail} className="mt-0.5 text-xs text-(--text-muted)">
          {detail}
        </p>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-(--text-muted)">{label}</dt>
      <dd className="mt-0.5 wrap-anywhere text-(--text-primary)">{value}</dd>
    </div>
  );
}

function MobileBorrowingMetadata({
  borrowing,
}: {
  borrowing: BoardGameBorrowingForAdmin;
}) {
  const applicationTime = (
    <Detail
      label="申請時間"
      value={formatAdminDateTime(borrowing.created_at)}
    />
  );
  const approver = (
    <Detail
      label="核准人"
      value={getApprovalActor(borrowing)?.name ?? "尚未記錄核准人"}
    />
  );

  if (borrowing.status === "pending") {
    return <MobileMetadataGrid>{applicationTime}</MobileMetadataGrid>;
  }

  if (borrowing.status === "cancelled") {
    return <MobileMetadataGrid>{applicationTime}{borrowing.cancelled_at ? <Detail label="取消時間" value={formatAdminDateTime(borrowing.cancelled_at)} /> : null}</MobileMetadataGrid>;
  }

  if (borrowing.status === "rejected") {
    return (
      <MobileMetadataGrid>
        {applicationTime}
        {borrowing.rejected_at ? <Detail label="拒絕時間" value={formatAdminDateTime(borrowing.rejected_at)} /> : null}
        <Detail
          label="拒絕人"
          value={getApprovalActor(borrowing)?.name ?? "尚未記錄拒絕人"}
        />
      </MobileMetadataGrid>
    );
  }

  if (borrowing.status === "approved") {
    return (
      <MobileMetadataGrid>
        {applicationTime}
        {borrowing.approved_at ? <Detail label="核准時間" value={formatAdminDateTime(borrowing.approved_at)} /> : null}
        {approver}
      </MobileMetadataGrid>
    );
  }

  if (borrowing.status === "borrowed") {
    return (
      <MobileMetadataGrid>
        {applicationTime}
        {borrowing.approved_at ? <Detail label="核准時間" value={formatAdminDateTime(borrowing.approved_at)} /> : null}
        <Detail
          label="借出時間"
          value={formatOptionalDate(borrowing.borrowed_at)}
        />
        <Detail label="預計歸還" value={formatOptionalDate(borrowing.due_at)} />
        {approver}
      </MobileMetadataGrid>
    );
  }

  return (
    <MobileMetadataGrid>
      {applicationTime}
      {borrowing.approved_at ? <Detail label="核准時間" value={formatAdminDateTime(borrowing.approved_at)} /> : null}
      <Detail
        label="借出時間"
        value={formatOptionalDate(borrowing.borrowed_at)}
      />
      <Detail label="預計歸還" value={formatOptionalDate(borrowing.due_at)} />
      <Detail
        label="歸還時間"
        value={formatOptionalDate(borrowing.returned_at)}
      />
      {approver}
    </MobileMetadataGrid>
  );
}

function MobileMetadataGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {children}
    </dl>
  );
}

function getApprovalActor(borrowing: BoardGameBorrowingForAdmin) {
  if (borrowing.status === "cancelled") return null;
  if (!borrowing.approved_by_user_id) return null;

  const label = borrowing.status === "rejected" ? "拒絕人" : "核准人";
  const name =
    borrowing.approved_by_user_profile?.real_name ||
    borrowing.approved_by_user?.name ||
    `尚未記錄${label}`;

  return { label, name };
}

function getApprovalActorLine(borrowing: BoardGameBorrowingForAdmin) {
  const actor = getApprovalActor(borrowing);
  if (!actor) return undefined;

  return `${actor.label === "拒絕人" ? "拒絕" : "核准"}：${actor.name}`;
}

function formatOptionalDate(value: string | null) {
  return value ? formatAdminDateTime(value) : "—";
}

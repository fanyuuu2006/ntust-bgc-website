"use client";

import { useId } from "react";
import { UserRound } from "lucide-react";

import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { clubPolicies } from "@/libs/clubPolicies";
import type { BoardGameBorrowingForAdmin } from "@/services/board-games/board-games.types";

export type BorrowingLifecycleAction =
  | "approve"
  | "reject"
  | "borrow"
  | "return";

type BorrowingActionDialogProps = {
  open: boolean;
  items: BoardGameBorrowingForAdmin[];
  action: BorrowingLifecycleAction;
  mode: "single" | "batch";
  dueAt?: string;
  error?: string | null;
  isSubmitting: boolean;
  onDueAtChange?: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const ACTION_COPY: Record<
  BorrowingLifecycleAction,
  { title: string; batchTitle: string; verb: string; confirmLabel: string; impact: string }
> = {
  approve: {
    title: "核准借用",
    batchTitle: "批次核准",
    verb: "核准",
    confirmLabel: "確認核准",
    impact: "核准後，借用人仍需由管理員確認借出，桌遊才會標記為借出中。",
  },
  reject: {
    title: "拒絕申請",
    batchTitle: "批次拒絕",
    verb: "拒絕",
    confirmLabel: "確認拒絕",
    impact: "拒絕後，此借用申請將無法繼續借出。",
  },
  borrow: {
    title: "確認借出",
    batchTitle: "批次確認借出",
    verb: "確認借出",
    confirmLabel: "確認借出",
    impact: "確認後，借用紀錄與關聯桌遊都會標記為借出中。",
  },
  return: {
    title: "確認歸還",
    batchTitle: "批次確認歸還",
    verb: "確認歸還",
    confirmLabel: "確認歸還",
    impact: "確認後，借用紀錄會標記為已歸還，關聯桌遊會恢復為可借用。",
  },
};

export function BorrowingActionDialog({
  open,
  items,
  action,
  mode,
  dueAt = "",
  error,
  isSubmitting,
  onDueAtChange,
  onClose,
  onConfirm,
}: BorrowingActionDialogProps) {
  const id = useId();
  const copy = ACTION_COPY[action];
  const isBatch = mode === "batch";
  const title = isBatch ? copy.batchTitle : copy.title;
  const hasNonCurrentMember = items.some(
    (item) => !item.is_current_academic_year_member,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={
        isBatch
          ? `將對已選取的 ${items.length} 筆借用紀錄執行${copy.verb}。`
          : "請確認借用紀錄與操作內容。"
      }
      closeDisabled={isSubmitting}
      contentClassName="max-h-[75dvh] overflow-hidden p-0"
    >
      <div className="flex max-h-[75dvh] min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <section aria-labelledby={`${id}-details-title`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3
                id={`${id}-details-title`}
                className="text-sm font-semibold text-(--text-primary)"
              >
                借用明細
              </h3>
              {isBatch ? (
                <span className="shrink-0 text-sm text-(--text-muted)">
                  共 {items.length} 筆
                </span>
              ) : null}
            </div>
            <ul
              aria-label="借用紀錄明細"
              className="divide-y divide-(--border-muted) rounded-lg border border-(--border-default) bg-(--surface-elevated)"
            >
              {items.map((item) => (
                <li key={item.id} className="min-w-0 px-3 py-2.5 text-sm">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <p className="min-w-0 wrap-anywhere font-medium text-(--text-primary)">
                      {item.board_game.name}
                    </p>
                    <BorrowingStatusBadge
                      status={item.status}
                      className="shrink-0"
                    />
                  </div>
                  <p className="mt-1 wrap-anywhere text-xs leading-5 text-(--text-muted)">
                    #{item.board_game.inventory_number}
                    <span aria-hidden="true"> · </span>
                    借用人：{item.user_profile?.real_name ?? item.user.name}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {action === "borrow" ? (
            <Field
              label={isBatch ? "統一預計歸還時間（台北時間）" : "預計歸還時間（台北時間）"}
              htmlFor={`${id}-due-at`}
              required
            >
              <Input
                id={`${id}-due-at`}
                required
                aria-required="true"
                autoFocus
                className="w-full"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => onDueAtChange?.(event.target.value)}
              />
            </Field>
          ) : null}

          {action === "borrow" && hasNonCurrentMember ? (
            <p className="flex items-start gap-2 rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 text-sm leading-6 text-(--text-secondary)">
              <UserRound
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-(--status-info)"
              />
              {clubPolicies.adminNonCurrentAcademicYearMemberBorrowingNotice}
            </p>
          ) : null}

          <p className="text-sm leading-6 text-(--text-muted)">
            {copy.impact}
            {isBatch
              ? " 系統會重新檢查全部借用與桌遊狀態；任一筆已變更時，整批不會更新。"
              : ""}
          </p>
          <FormFeedback error={error} />
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-(--border-default) bg-(--surface-elevated) p-4 sm:flex-row sm:justify-end sm:p-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="button"
            variant={action === "reject" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={isSubmitting || items.length === 0}
            isLoading={isSubmitting}
          >
            {isBatch ? `${copy.confirmLabel} ${items.length} 筆` : copy.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

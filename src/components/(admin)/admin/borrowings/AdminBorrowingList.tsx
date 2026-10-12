"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";

import { AdminBoardGameLink } from "@/components/(admin)/admin/AdminBoardGameLink";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminUserLink } from "@/components/(admin)/admin/users/AdminUserLink";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import { borrowingConfig } from "@/libs/borrowingConfig";
import { clubPolicies } from "@/libs/clubPolicies";
import type { BoardGameBorrowingForAdmin } from "@/services/board-games/board-games.types";
import {
  formatAdminDateTime,
  formatTaipeiDateTimeLocal,
  getFutureTaipeiDateTimeLocal,
  parseTaipeiDateTimeLocal,
} from "@/utils/date";

type Action = "approve" | "reject" | "checkout" | "return" | "edit";

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
    if (!busy) setSelected(null);
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

  const actionTitle = selected ? actionTitles[selected.action] : "";
  const actionDescription = selected
    ? `桌遊「${selected.borrowing.board_game.name}」的借用。`
    : "";

  return (
    <div className="space-y-4">
      <FormFeedback error={feedback} />

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

          <div className="grid min-w-0 max-w-full gap-3 lg:hidden">
            {borrowings.map((borrowing) => (
              <Card
                key={borrowing.id}
                className="w-full min-w-0 max-w-full space-y-3 p-4"
              >
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
                <BorrowingActions borrowing={borrowing} onAction={choose} />
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={selected?.action === "checkout" || selected?.action === "edit"}
        onClose={close}
        title={actionTitle}
        description={actionDescription}
      >
        <div className="space-y-4">
          {selected ? <CheckoutContext borrowing={selected.borrowing} /> : null}
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
            {selected?.action === "checkout"
              ? "已套用預設歸還時間，可依實際情況調整。"
              : "僅能調整借出中的預計歸還時間。"}
          </p>
          {selected?.action === "checkout" &&
          selected &&
          !selected.borrowing.is_current_academic_year_member ? (
            <p className="flex items-start gap-2 rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 text-sm leading-6 text-(--text-secondary)">
              <UserRound
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-(--status-info)"
              />
              {clubPolicies.adminNonCurrentAcademicYearMemberBorrowingNotice}
            </p>
          ) : null}
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
              {selected?.action === "edit" ? "儲存變更" : "確認借出"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(
          selected &&
          selected.action !== "checkout" &&
          selected.action !== "edit",
        )}
        onClose={close}
        onConfirm={run}
        isSubmitting={busy}
        title={actionTitle}
        description={actionDescription}
        confirmLabel={selected ? actionConfirmLabels[selected.action] : "確認"}
        confirmVariant={
          selected?.action === "reject"
            ? "danger"
            : "primary"
        }
      />
    </div>
  );
}

const actionTitles: Record<Action, string> = {
  approve: "核准借用",
  reject: "拒絕申請",
  checkout: "確認借出",
  return: "確認歸還",
  edit: "編輯借用紀錄",
};

const actionConfirmLabels: Record<Action, string> = {
  approve: "確認核准",
  reject: "確認拒絕",
  checkout: "確認借出",
  return: "確認歸還",
  edit: "儲存變更",
};

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

function CheckoutContext({
  borrowing,
}: {
  borrowing: BoardGameBorrowingForAdmin;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 text-sm">
      <div>
        <p className="text-xs font-medium text-(--text-muted)">借用人</p>
        <div className="mt-1">
          <BorrowerSummary borrowing={borrowing} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-(--text-muted)">桌遊</p>
        <div className="mt-1">
          <BoardGameSummary borrowing={borrowing} />
        </div>
      </div>
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

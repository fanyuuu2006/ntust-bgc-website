"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";

import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
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
import { borrowingConfig } from "@/libs/borrowingConfig";
import { clubPolicies } from "@/libs/clubPolicies";
import type { BoardGameBorrowingForAdmin } from "@/services/board-games/board-games.types";
import type { BorrowingStatus } from "@/types/database";
import {
  formatAdminDateTime,
  formatTaipeiDateTimeLocal,
  getFutureTaipeiDateTimeLocal,
  parseTaipeiDateTimeLocal,
} from "@/utils/date";
import { buildQueryString } from "@/utils/url";

type Action = "approve" | "reject" | "checkout" | "return" | "edit" | "delete";
type BorrowingQuery = {
  search?: string;
  status?: BorrowingStatus;
  board_game_id?: string;
  user_id?: string;
  orderBy?: "created_at" | "borrowed_at" | "due_at" | "returned_at";
  orderDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

const BASE_PATH = "/admin/board-games/borrowings";
const SORT_OPTIONS = [
  { value: "created_at:desc", label: "最新申請" },
  { value: "created_at:asc", label: "最早申請" },
  { value: "borrowed_at:desc", label: "最近借出" },
  { value: "due_at:asc", label: "歸還期限較近" },
  { value: "returned_at:desc", label: "最近歸還" },
] as const;

export function AdminBorrowingList({
  borrowings,
  query,
}: {
  borrowings: BoardGameBorrowingForAdmin[];
  query: BorrowingQuery;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<{
    borrowing: BoardGameBorrowingForAdmin;
    action: Action;
  } | null>(null);
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const clearSearchQuery = buildQueryString({
    status: query.status,
    board_game_id: query.board_game_id,
    user_id: query.user_id,
    orderBy: query.orderBy,
    orderDirection: query.orderDirection,
    pageSize: query.pageSize,
  });
  const clearSearchHref = clearSearchQuery
    ? `${BASE_PATH}?${clearSearchQuery}`
    : BASE_PATH;
  const currentSort = `${query.orderBy ?? "created_at"}:${query.orderDirection ?? "desc"}`;
  const hasQuery = Boolean(
    query.search ||
      query.status ||
      query.board_game_id ||
      query.user_id ||
      query.page && query.page > 1,
  );

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
    if (!selected) return;

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
      if (selected.action === "delete") {
        await apiClient(`/api/admin/borrowings/${selected.borrowing.id}`, {
          method: "DELETE",
        });
      } else {
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
      }
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
    ? selected.action === "delete"
      ? `確定要永久刪除「${selected.borrowing.board_game.name}」的借用紀錄嗎？借用人：${getBorrowerName(selected.borrowing)}。刪除後將無法復原。`
      : `桌遊「${selected.borrowing.board_game.name}」的借用。`
    : "";

  return (
    <div className="space-y-4">
      <AdminToolbar aria-label="桌遊借用管理搜尋與篩選">
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const search =
              String(formData.get("search") ?? "").trim() || undefined;
            const status =
              String(formData.get("status") ?? "").trim() || undefined;
            const sort = String(formData.get("sort") ?? currentSort);
            const [orderBy, orderDirection] = sort.split(":") as [
              BorrowingQuery["orderBy"],
              BorrowingQuery["orderDirection"],
            ];
            router.push(
              `${BASE_PATH}?${buildQueryString(toHeaderQuery(query), {
                search,
                status,
                orderBy,
                orderDirection,
                page: "1",
              })}`,
            );
          }}
        >
          <ClearableSearchInput
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊、借用人或 Email"
            className="w-full"
          />
          <Select
            name="status"
            aria-label="借用狀態"
            defaultValue={query.status ?? ""}
            className="w-full"
          >
            <option value="">全部狀態</option>
            <option value="pending">待確認</option>
            <option value="approved">已核准</option>
            <option value="borrowed">借出中</option>
            <option value="returned">已歸還</option>
            <option value="rejected">已拒絕</option>
            <option value="cancelled">已取消</option>
          </Select>
          <Select
            name="sort"
            aria-label="排序"
            defaultValue={currentSort}
            className="w-full"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" className="w-full sm:w-auto">
            搜尋
          </Button>
        </form>
      </AdminToolbar>

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
                    <TableCell className="min-w-56">
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
                    titleClassName="line-clamp-2"
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
          <Field label="預計歸還時間（台北時間）" htmlFor="borrowing-due-at">
            <Input
              id="borrowing-due-at"
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
          selected?.action === "reject" || selected?.action === "delete"
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
  delete: "刪除借用紀錄",
};

const actionConfirmLabels: Record<Action, string> = {
  approve: "確認核准",
  reject: "確認拒絕",
  checkout: "確認借出",
  return: "確認歸還",
  edit: "儲存變更",
  delete: "刪除借用紀錄",
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
      <Button
        size="sm"
        variant="danger"
        onClick={() => onAction(borrowing, "delete")}
      >
        刪除
      </Button>
    </div>
  );
}

function BoardGameSummary({
  borrowing,
  titleClassName = "truncate",
}: {
  borrowing: BoardGameBorrowingForAdmin;
  titleClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className={`${titleClassName} font-medium text-(--text-primary)`}>
        {borrowing.board_game.name}
      </p>
      <p className="mt-1 text-xs text-(--text-muted)">
        社產編號 #
        {String(borrowing.board_game.inventory_number).padStart(3, "0")}
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
      <p className="truncate font-medium text-(--text-primary)">
        {getBorrowerName(borrowing)}
      </p>
      <p className="truncate text-xs text-(--text-muted)">
        {borrowing.user.email}
      </p>
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
        label="申請時間"
        value={formatAdminDateTime(borrowing.created_at)}
        details={[actorLine, "等待確認借出"]}
      />
    );
  }
  if (borrowing.status === "rejected") {
    return (
      <Timeline
        label="申請時間"
        value={formatAdminDateTime(borrowing.created_at)}
        details={[actorLine]}
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
      <p className="mt-0.5 wrap-break-word text-sm text-(--text-primary)">
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
      <dd className="mt-0.5 wrap-break-word text-(--text-primary)">{value}</dd>
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
    return <MobileMetadataGrid>{applicationTime}</MobileMetadataGrid>;
  }

  if (borrowing.status === "rejected") {
    return (
      <MobileMetadataGrid>
        {applicationTime}
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
        {approver}
      </MobileMetadataGrid>
    );
  }

  if (borrowing.status === "borrowed") {
    return (
      <MobileMetadataGrid>
        {applicationTime}
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

function getBorrowerName(borrowing: BoardGameBorrowingForAdmin) {
  return borrowing.user_profile?.real_name || borrowing.user.name;
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

function toHeaderQuery(
  query: BorrowingQuery,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

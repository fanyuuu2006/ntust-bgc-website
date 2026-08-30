"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
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
import type { BoardGameBorrowingForAdmin } from "@/services/board-games/board-games.types";
import type { BorrowingStatus } from "@/types/database";
import { formatAdminDateTime } from "@/utils/date";
import { buildQueryString } from "@/utils/url";

type Action = "approve" | "reject" | "checkout" | "return";
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
    ? BASE_PATH + "?" + clearSearchQuery
    : BASE_PATH;

  function choose(borrowing: BoardGameBorrowingForAdmin, action: Action) {
    setDueAt("");
    setFeedback(null);
    setSelected({ borrowing, action });
  }

  function close() {
    if (!busy) setSelected(null);
  }

  async function run() {
    if (!selected) return;
    if (selected.action === "checkout" && !dueAt) {
      setFeedback("請先設定應還時間。");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      await apiClient("/api/admin/borrowings/" + selected.borrowing.id, {
        method: "PATCH",
        body: {
          action: selected.action,
          ...(selected.action === "checkout"
            ? { due_at: new Date(dueAt).toISOString() }
            : {}),
        },
      });
      setSelected(null);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "操作失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  const actionTitle = selected
    ? {
        approve: "核准借用申請",
        reject: "拒絕借用申請",
        checkout: "確認借出桌遊",
        return: "確認歸還桌遊",
      }[selected.action]
    : "";
  const actionDescription = selected
    ? "桌遊「" + selected.borrowing.board_game.name + "」將套用此操作。"
    : "";

  return (
    <div className="space-y-4">
      <AdminToolbar aria-label="借用搜尋與篩選">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const search = String(formData.get("search") ?? "").trim() || undefined;
            const status = String(formData.get("status") ?? "").trim() || undefined;
            router.push(
              BASE_PATH +
                "?" +
                buildQueryString(toHeaderQuery(query), { search, status, page: "1" }),
            );
          }}
        >
          <ClearableSearchInput
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊、社產編號或借用人"
            className="w-full"
          />
          <Button type="submit" className="order-2 w-full md:order-3 md:w-auto">
            搜尋
          </Button>
          <Select
            name="status"
            aria-label="借用狀態"
            defaultValue={query.status ?? ""}
            className="order-3 w-full md:order-2"
          >
            <option value="">全部狀態</option>
            <option value="pending">待審核</option>
            <option value="approved">已核准</option>
            <option value="borrowed">借出中</option>
            <option value="returned">已歸還</option>
            <option value="rejected">已拒絕</option>
          </Select>
        </form>
      </AdminToolbar>

      <FormFeedback error={feedback} />

      {borrowings.length === 0 ? (
        <EmptyState
          title="目前沒有借用紀錄"
          description="調整篩選條件後再試一次。"
        />
      ) : (
        <>
          <AdminListSection className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>桌遊</TableHead>
                  <TableHead>借用人</TableHead>
                  <TableHead>狀態</TableHead>
                  <SortableTableHeader
                    label="申請時間"
                    column="created_at"
                    basePath={BASE_PATH}
                    query={toHeaderQuery(query)}
                  />
                  <SortableTableHeader
                    label="借出時間"
                    column="borrowed_at"
                    basePath={BASE_PATH}
                    query={toHeaderQuery(query)}
                  />
                  <SortableTableHeader
                    label="應還時間"
                    column="due_at"
                    basePath={BASE_PATH}
                    query={toHeaderQuery(query)}
                  />
                  <SortableTableHeader
                    label="歸還時間"
                    column="returned_at"
                    basePath={BASE_PATH}
                    query={toHeaderQuery(query)}
                  />
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowings.map((borrowing) => (
                  <TableRow key={borrowing.id}>
                    <TableCell className="font-medium">
                      {borrowing.board_game.name}
                      <span className="ml-2 text-xs text-(--muted)">
                        #{String(borrowing.board_game.inventory_number).padStart(3, "0")}
                      </span>
                    </TableCell>
                    <TableCell>{getBorrowerName(borrowing)}</TableCell>
                    <TableCell>
                      <BorrowingStatusBadge status={borrowing.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatAdminDateTime(borrowing.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatOptionalDate(borrowing.borrowed_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatOptionalDate(borrowing.due_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatOptionalDate(borrowing.returned_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <BorrowingActions borrowing={borrowing} onAction={choose} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminListSection>

          <div className="grid min-w-0 max-w-full gap-3 md:hidden">
            {borrowings.map((borrowing) => (
              <Card key={borrowing.id} className="w-full min-w-0 max-w-full space-y-3 p-4">
                <div className="flex min-w-0 max-w-full items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold">
                      {borrowing.board_game.name}
                    </h2>
                    <p className="truncate text-sm text-(--muted)">
                      社產編號 #{String(borrowing.board_game.inventory_number).padStart(3, "0")}
                    </p>
                  </div>
                  <span className="shrink-0">
                    <BorrowingStatusBadge status={borrowing.status} />
                  </span>
                </div>
                <dl className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 text-sm md:grid-cols-2">
                  <Detail label="借用人" value={getBorrowerName(borrowing)} />
                  <Detail label="申請時間" value={formatAdminDateTime(borrowing.created_at)} />
                  <Detail label="借出時間" value={formatOptionalDate(borrowing.borrowed_at)} />
                  <Detail label="應還時間" value={formatOptionalDate(borrowing.due_at)} />
                  <Detail label="歸還時間" value={formatOptionalDate(borrowing.returned_at)} />
                </dl>
                <BorrowingActions borrowing={borrowing} onAction={choose} />
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={selected?.action === "checkout"}
        onClose={close}
        title={actionTitle}
        description={actionDescription}
      >
        <div className="space-y-4">
          <Field label="應還時間" htmlFor="borrowing-due-at">
            <Input
              id="borrowing-due-at"
              autoFocus
              className="w-full"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </Field>
          <FormFeedback error={feedback} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close} disabled={busy}>
              取消
            </Button>
            <Button type="button" onClick={run} disabled={busy} isLoading={busy}>
              {busy ? "處理中…" : "確認借出"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(selected && selected.action !== "checkout")}
        onClose={close}
        onConfirm={run}
        isSubmitting={busy}
        title={actionTitle}
        description={actionDescription}
        confirmLabel={
          selected?.action === "reject"
            ? "確認拒絕"
            : selected?.action === "return"
              ? "確認歸還"
              : "確認核准"
        }
      />
    </div>
  );
}

function BorrowingActions({
  borrowing,
  onAction,
}: {
  borrowing: BoardGameBorrowingForAdmin;
  onAction: (borrowing: BoardGameBorrowingForAdmin, action: Action) => void;
}) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap justify-start gap-2 md:justify-end">
      {borrowing.status === "pending" ? (
        <>
          <Button className="px-3 py-2 text-sm" onClick={() => onAction(borrowing, "approve")}>
            核准
          </Button>
          <Button
            variant="danger"
            className="px-3 py-2 text-sm"
            onClick={() => onAction(borrowing, "reject")}
          >
            拒絕
          </Button>
        </>
      ) : null}
      {borrowing.status === "approved" ? (
        <Button className="px-3 py-2 text-sm" onClick={() => onAction(borrowing, "checkout")}>
          確認借出
        </Button>
      ) : null}
      {borrowing.status === "borrowed" ? (
        <Button className="px-3 py-2 text-sm" onClick={() => onAction(borrowing, "return")}>
          確認歸還
        </Button>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-(--muted)">{label}</dt>
      <dd className="mt-0.5 min-w-0 break-words">{value}</dd>
    </div>
  );
}

function getBorrowerName(borrowing: BoardGameBorrowingForAdmin) {
  return borrowing.user_profile?.real_name || borrowing.user.name;
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

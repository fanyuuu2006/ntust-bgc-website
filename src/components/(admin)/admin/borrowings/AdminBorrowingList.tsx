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
const FILTERS: Array<{ label: string; value?: BorrowingStatus }> = [
  { label: "全部" },
  { label: "待審核", value: "pending" },
  { label: "已核准", value: "approved" },
  { label: "借出中", value: "borrowed" },
  { label: "已歸還", value: "returned" },
  { label: "已拒絕", value: "rejected" },
];

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

  function changeStatus(status?: BorrowingStatus) {
    router.push(
      BASE_PATH +
        "?" +
        buildQueryString(toHeaderQuery(query), { status, page: "1" }),
    );
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
      <AdminToolbar
        aria-label="借用搜尋與篩選"
        className="flex flex-col gap-3 md:flex-row md:items-center"
      >
        <form
          className="flex w-full flex-col gap-2 md:flex-1 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const search =
              String(new FormData(event.currentTarget).get("search") ?? "").trim() ||
              undefined;
            router.push(
              BASE_PATH +
                "?" +
                buildQueryString(toHeaderQuery(query), { search, page: "1" }),
            );
          }}
        >
          <ClearableSearchInput
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊、社產編號或借用人"
            className="w-full md:flex-1"
          />
          <Button type="submit" className="w-full md:w-auto">
            搜尋
          </Button>
        </form>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          {FILTERS.map((filter) => (
            <Button
              type="button"
              key={filter.label}
              variant={query.status === filter.value ? "primary" : "outline"}
              className="px-3 py-2 text-sm"
              onClick={() => changeStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </AdminToolbar>

      <FormFeedback error={feedback} />

      {borrowings.length === 0 ? (
        <EmptyState
          title="目前沒有借用紀錄"
          description="調整篩選條件後再試一次。"
        />
      ) : (
        <>
          <AdminListSection className="hidden lg:block">
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

          <div className="grid gap-3 lg:hidden">
            {borrowings.map((borrowing) => (
              <Card key={borrowing.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {borrowing.board_game.name}
                    </h2>
                    <p className="text-sm text-(--muted)">
                      社產編號 #{String(borrowing.board_game.inventory_number).padStart(3, "0")}
                    </p>
                  </div>
                  <span className="shrink-0">
                    <BorrowingStatusBadge status={borrowing.status} />
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
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
    <div className="flex flex-wrap justify-end gap-2">
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
    <div>
      <dt className="text-xs text-(--muted)">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
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

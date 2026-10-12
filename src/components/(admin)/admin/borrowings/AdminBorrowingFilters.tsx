"use client";

import { useRouter } from "next/navigation";

import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { buildOwnedQueryHref } from "@/libs/query-navigation";
import type { BorrowingStatus } from "@/types/database";

export type AdminBorrowingQuery = {
  search?: string;
  status?: BorrowingStatus;
  overdue?: "true";
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

export function AdminBorrowingFilters({ query }: { query: AdminBorrowingQuery }) {
  const router = useRouter();
  const appliedQuery = toAppliedQuery(query);
  const clearSearchHref = buildOwnedQueryHref({
    basePath: BASE_PATH,
    appliedQuery,
    ownedKeys: ["search"],
    changes: { search: undefined },
  });
  const currentSort = `${query.orderBy ?? "created_at"}:${query.orderDirection ?? "desc"}`;

  return (
    <AdminToolbar aria-label="桌遊借用管理搜尋與篩選">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <form
          className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          aria-label="搜尋借用紀錄"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const search = String(formData.get("search") ?? "").trim() || undefined;
            router.push(
              buildOwnedQueryHref({
                basePath: BASE_PATH,
                appliedQuery,
                ownedKeys: ["search"],
                changes: { search },
              }),
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
          <Button type="submit" variant="primary" className="w-full sm:w-auto">
            搜尋
          </Button>
        </form>
        <Select
          value={query.overdue === "true" ? "overdue" : query.status ?? ""}
          onChange={(event) => {
            const selectedStatus = event.target.value;
            router.push(buildOwnedQueryHref({
              basePath: BASE_PATH,
              appliedQuery,
              ownedKeys: ["status", "overdue"],
              changes: {
                status: selectedStatus === "overdue" ? "borrowed" : selectedStatus,
                overdue: selectedStatus === "overdue" ? "true" : undefined,
              },
            }));
          }}
          aria-label="借用狀態"
          className="w-full"
        >
          <option value="">全部狀態</option>
          <option value="pending">待審核</option>
          <option value="approved">等待領取</option>
          <option value="borrowed">借出中（含逾期）</option>
          <option value="overdue">已逾期</option>
          <option value="returned">已歸還</option>
          <option value="rejected">已拒絕</option>
          <option value="cancelled">已取消</option>
        </Select>
        <Select
          aria-label="排序"
          value={currentSort}
          className="w-full"
          onChange={(event) => {
            const [orderBy, orderDirection] = event.target.value.split(":") as [
              AdminBorrowingQuery["orderBy"],
              AdminBorrowingQuery["orderDirection"],
            ];
            router.push(
              buildOwnedQueryHref({
                basePath: BASE_PATH,
                appliedQuery,
                ownedKeys: ["orderBy", "orderDirection"],
                changes: { orderBy, orderDirection },
              }),
            );
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </AdminToolbar>
  );
}

function toAppliedQuery(
  query: AdminBorrowingQuery,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

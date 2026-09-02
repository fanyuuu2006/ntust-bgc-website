import Link from "next/link";
import { ArrowUpDown, ListFilter, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { MembershipStatus, MembershipType } from "@/types/database";

type MembershipRecordsQuery = {
  search?: string;
  type?: MembershipType;
  status?: MembershipStatus;
  orderDirection: "asc" | "desc";
};

export function MembershipRecordsToolbar({
  query,
}: {
  query: MembershipRecordsQuery;
}) {
  const hasFilters = Boolean(query.search || query.type || query.status || query.orderDirection === "asc");
  const activeConditions = [
    query.search ? `搜尋「${query.search}」` : null,
    query.type === "annual" ? "一般社員" : null,
    query.type === "lifetime" ? "終生社員" : null,
    query.status === "active" ? "生效中" : null,
    query.status === "pending" ? "處理中" : null,
    query.status === "suspended" ? "已停用" : null,
    query.status === "expired" ? "已失效" : null,
    query.status === "cancelled" ? "已取消" : null,
    query.orderDirection === "asc" ? "最早學年度" : null,
  ].filter((condition): condition is string => Boolean(condition));

  return (
    <form action="/memberships" className="space-y-3">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="orderBy" value="academic_year" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜尋社員紀錄</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--text-muted)"
          />
          <Input
            name="search"
            type="search"
            defaultValue={query.search}
            placeholder="搜尋社員紀錄"
            className="pl-9"
          />
        </label>

        <details className="group sm:relative">
          <summary className="btn outline flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium marker:content-none">
            <ListFilter aria-hidden="true" className="size-4" />
            篩選
          </summary>
          <div className="mt-2 grid gap-3 rounded-xl border border-(--border-default) bg-(--surface-default) p-3 sm:absolute sm:right-0 sm:z-10 sm:min-w-64 sm:shadow-(--shadow-card)">
            <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
              社員類型
              <Select name="type" defaultValue={query.type ?? ""}>
                <option value="">全部類型</option>
                <option value="annual">一般社員</option>
                <option value="lifetime">終生社員</option>
              </Select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
              狀態
              <Select name="status" defaultValue={query.status ?? ""}>
                <option value="">全部狀態</option>
                <option value="active">生效中</option>
                <option value="pending">處理中</option>
                <option value="suspended">已停用</option>
                <option value="expired">已失效</option>
                <option value="cancelled">已取消</option>
              </Select>
            </label>
          </div>
        </details>

        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-within:border-(--interactive-primary) focus-within:outline-2 focus-within:outline-(--focus-ring)">
          <ArrowUpDown aria-hidden="true" className="size-4 text-(--text-muted)" />
          <span className="sr-only">排序</span>
          <Select
            name="orderDirection"
            defaultValue={query.orderDirection}
            focusOwner="parent"
            className="min-h-0 min-w-0 border-0 bg-transparent px-0 py-0"
          >
            <option value="desc">最新學年度</option>
            <option value="asc">最早學年度</option>
          </Select>
        </label>

        <Button type="submit" variant='primary' size="md">
          搜詢
        </Button>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--text-muted)">
          <p>目前條件：{activeConditions.join(" · ")}</p>
          <Link
            href="/memberships"
            className="font-medium text-(--action) hover:text-(--action-hover) hover:underline"
          >
            清除條件
          </Link>
        </div>
      ) : null}
    </form>
  );
}

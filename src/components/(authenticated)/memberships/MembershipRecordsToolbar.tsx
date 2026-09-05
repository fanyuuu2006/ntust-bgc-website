import Link from "next/link";
import { ArrowUpDown } from "lucide-react";

import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { QueryFilterDisclosure } from "@/components/query/QueryFilterDisclosure";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { MembershipStatus, MembershipType } from "@/types/database";
import { buildQueryString } from "@/utils/url";

type MembershipRecordsQuery = {
  search?: string;
  type?: MembershipType;
  status?: MembershipStatus;
  orderDirection: "asc" | "desc";
  pageSize: number;
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
  const clearSearchQuery = buildQueryString({
    type: query.type,
    status: query.status,
    orderBy: "academic_year",
    orderDirection: query.orderDirection,
    page: 1,
    pageSize: query.pageSize,
  });
  const clearSearchHref = `/memberships?${clearSearchQuery}`;

  return (
    <form method="GET" action="/memberships" className="space-y-2">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={query.pageSize} />
      <input type="hidden" name="orderBy" value="academic_year" />

      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
        <ClearableSearchInput
          initialValue={query.search}
          clearHref={clearSearchHref}
          name="search"
          placeholder="搜尋社員紀錄"
          aria-label="搜尋社員紀錄"
          inputClassName="text-base lg:text-sm"
        />

        <Button type="submit" variant="primary" size="md" className="w-full lg:w-auto">
          搜尋
        </Button>

        <QueryFilterDisclosure>
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
        </QueryFilterDisclosure>

        <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-within:border-(--interactive-primary) focus-within:outline-2 focus-within:outline-(--focus-ring) lg:min-w-40">
          <ArrowUpDown aria-hidden="true" className="size-4 shrink-0 text-(--text-muted)" />
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

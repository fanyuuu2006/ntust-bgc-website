import { Suspense } from "react";
import { ArrowUpDown } from "lucide-react";

import {
  BorrowingsResults,
  type BorrowingsResultQuery,
} from "@/components/(authenticated)/borrowings/BorrowingsResults";
import { BorrowingsResultsLoading } from "@/components/(authenticated)/borrowings/BorrowingsResultsLoading";
import { BORROWING_STATUS_LABEL } from "@/components/BorrowingStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { QueryFilterDisclosure } from "@/components/query/QueryFilterDisclosure";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { getCurrentUser } from "@/libs/auth";
import type { BorrowingStatus } from "@/types/database";
import { parsePage, parsePageSize } from "@/utils/pagination";
import { buildQueryString } from "@/utils/url";

const BASE_PATH = "/borrowings";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const STATUS_OPTIONS: Array<{ value: BorrowingStatus; label: string }> = [
  { value: "pending", label: BORROWING_STATUS_LABEL.pending },
  { value: "approved", label: BORROWING_STATUS_LABEL.approved },
  { value: "borrowed", label: BORROWING_STATUS_LABEL.borrowed },
  { value: "returned", label: BORROWING_STATUS_LABEL.returned },
  { value: "rejected", label: BORROWING_STATUS_LABEL.rejected },
  { value: "cancelled", label: BORROWING_STATUS_LABEL.cancelled },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "最新申請" },
  { value: "created_at:asc", label: "最早申請" },
  { value: "due_at:asc", label: "歸還期限較近" },
  { value: "returned_at:desc", label: "最近歸還" },
] as const;

type BorrowingsSearchParams = {
  status?: string | string[];
  search?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

type BorrowingsPageProps = {
  searchParams: Promise<BorrowingsSearchParams>;
};

function normalizeStatus(value?: string | string[]): BorrowingStatus | undefined {
  const status = Array.isArray(value) ? value[0] : value;
  return STATUS_OPTIONS.some((option) => option.value === status)
    ? (status as BorrowingStatus)
    : undefined;
}

function normalizeSort(value?: string) {
  const option =
    SORT_OPTIONS.find((item) => item.value === value) ?? SORT_OPTIONS[0];
  const [orderBy, orderDirection] = option.value.split(":") as [
    "created_at" | "due_at" | "returned_at",
    "asc" | "desc",
  ];

  return { option, orderBy, orderDirection };
}

export default async function BorrowingsPage({
  searchParams,
}: BorrowingsPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize, DEFAULT_PAGE_SIZE, 50);
  const status = normalizeStatus(params.status);
  const search = params.search?.trim() || undefined;
  const sort = normalizeSort(params.sort);
  const resultQuery: BorrowingsResultQuery = {
    page,
    pageSize,
    status,
    search,
    orderBy: sort.orderBy,
    orderDirection: sort.orderDirection,
    sort: sort.option.value,
  };
  const resultQueryKey = buildQueryString(resultQuery);

  return (
    <section className="py-8">
      <div className="container max-w-3xl space-y-6">
        <PageHeader
          eyebrow="我的桌遊"
          title="借用紀錄"
          description="查看目前借用進度與過去的借用紀錄。"
          actions={
            <ButtonLink href="/board-games" variant="outline">
              瀏覽桌遊
            </ButtonLink>
          }
        />

        <BorrowingsToolbar
          status={status}
          search={search}
          sort={sort.option.value}
          pageSize={pageSize}
        />

        <Suspense
          key={resultQueryKey}
          fallback={<BorrowingsResultsLoading />}
        >
          <BorrowingsResults
            userId={user.id}
            query={resultQuery}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </Suspense>
      </div>
    </section>
  );
}

function BorrowingsToolbar({
  status,
  search,
  sort,
  pageSize,
}: {
  status?: BorrowingStatus;
  search?: string;
  sort: string;
  pageSize: number;
}) {
  const hasFilters = Boolean(status || search || sort !== SORT_OPTIONS[0].value);
  const clearSearchQuery = buildQueryString({
    status,
    sort,
    page: 1,
    pageSize,
  });
  const clearSearchHref = `${BASE_PATH}?${clearSearchQuery}`;

  return (
    <form method="GET" action={BASE_PATH} className="space-y-2">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={pageSize} />

      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
        <ClearableSearchInput
            initialValue={search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊或社產編號"
            aria-label="搜尋借用紀錄"
            inputClassName="text-base lg:text-sm"
        />

        <Button type="submit" variant="primary" className="w-full lg:w-auto">
          搜尋
        </Button>

        <QueryFilterDisclosure panelClassName="lg:min-w-56">
            <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
              借用狀態
              <Select name="status" defaultValue={status ?? ""}>
                <option value="">全部狀態</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
        </QueryFilterDisclosure>

        <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-within:border-(--interactive-primary) focus-within:outline-2 focus-within:outline-(--focus-ring) lg:min-w-40">
            <ArrowUpDown
              aria-hidden="true"
              className="size-4 shrink-0 text-(--text-muted)"
            />
            <span className="sr-only">排序</span>
            <Select
              name="sort"
              defaultValue={sort}
              focusOwner="parent"
              className="min-h-0 min-w-0 border-0 bg-transparent px-0 py-0"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
        </label>
      </div>

      {hasFilters ? (
        <div className="flex items-center gap-3 text-sm text-(--text-muted)">
          <p>已套用查詢條件</p>
          <ButtonLink
            href={BASE_PATH}
            variant="text"
            size="sm"
            className="min-h-0 px-0"
          >
            清除條件
          </ButtonLink>
        </div>
      ) : null}
    </form>
  );
}

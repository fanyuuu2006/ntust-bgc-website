import { ArrowUpDown, ListFilter, Search } from "lucide-react";

import { BorrowingRecord } from "@/components/(authenticated)/borrowings/BorrowingRecord";
import { BORROWING_STATUS_LABEL } from "@/components/BorrowingStatusBadge";
import { Pagination } from "@/components/Pagination/Pagination";
import { PageHeader } from "@/components/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BorrowingStatus } from "@/types/database";
import { parsePage, parsePageSize } from "@/utils/pagination";

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
  const borrowings = await boardGamesService.getBorrowingsByUserId(user.id, {
    page,
    pageSize,
    status,
    search,
    orderBy: sort.orderBy,
    orderDirection: sort.orderDirection,
  });

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

        {borrowings.data.length === 0 ? (
          <EmptyState
            title={
              search || status
                ? "找不到符合條件的借用紀錄"
                : "目前沒有借用紀錄"
            }
            description={
              search || status
                ? "試著調整搜尋或篩選條件。"
                : "你可以先瀏覽社團桌遊，找到想借用的桌遊後提出申請。"
            }
            action={
              !search && !status ? (
                <ButtonLink href="/board-games" variant="outline">
                  瀏覽桌遊
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {borrowings.data.map((borrowing) => (
              <li key={borrowing.id}>
                <BorrowingRecord borrowing={borrowing} />
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={borrowings.total}
          totalPages={borrowings.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={{ status, search, sort: sort.option.value }}
        />
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

  return (
    <form action={BASE_PATH} className="space-y-2.5">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={pageSize} />

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜尋借用紀錄</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--text-muted)"
          />
          <Input
            name="search"
            type="search"
            defaultValue={search}
            placeholder="搜尋桌遊或社產編號"
            className="pl-9 text-base md:text-sm"
          />
        </label>

        <details className="group md:relative">
          <summary className="btn outline flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium marker:content-none">
            <ListFilter aria-hidden="true" className="size-4" />
            篩選
          </summary>
          <div className="mt-2 rounded-xl border border-(--border-default) bg-(--surface-default) p-3 md:absolute md:right-0 md:z-10 md:min-w-56 md:shadow-(--shadow-card)">
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
          </div>
        </details>

        <div className="flex min-w-0 gap-2 md:contents">
          <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-within:border-(--interactive-primary) focus-within:outline-2 focus-within:outline-(--focus-ring) md:flex-none md:min-w-40">
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

          <Button type="submit" variant="outline">
            套用
          </Button>
        </div>
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

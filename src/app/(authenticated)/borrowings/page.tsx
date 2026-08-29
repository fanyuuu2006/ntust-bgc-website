import { BoardGameImage } from "@/components/BoardGameImage";
import {
  BORROWING_STATUS_LABEL,
  BorrowingStatusBadge,
} from "@/components/BorrowingStatusBadge";
import { Pagination } from "@/components/Pagination/Pagination";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BorrowingStatus } from "@/types/database";
import { formatDate } from "@/utils/date";
import { parsePage, parsePageSize } from "@/utils/pagination";

const BASE_PATH = "/borrowings";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const STATUS_OPTIONS: Array<{
  value: BorrowingStatus;
  label: string;
}> = [
  { value: "pending", label: BORROWING_STATUS_LABEL.pending },
  { value: "approved", label: BORROWING_STATUS_LABEL.approved },
  { value: "borrowed", label: BORROWING_STATUS_LABEL.borrowed },
  { value: "returned", label: BORROWING_STATUS_LABEL.returned },
  { value: "rejected", label: BORROWING_STATUS_LABEL.rejected },
];

type BorrowingsSearchParams = {
  status?: string | string[];
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

export default async function BorrowingsPage({
  searchParams,
}: BorrowingsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize, DEFAULT_PAGE_SIZE, 50);
  const status = normalizeStatus(params.status);
  const borrowings = await boardGamesService.getBorrowingsByUserId(user.id, {
    page,
    pageSize,
    status,
  });

  return (
    <section className="py-8">
      <div className="container space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-(--interactive-primary)">
              我的桌遊借用
            </p>
            <h1 className="text-2xl font-bold text-(--text-primary) sm:text-3xl">
              借用紀錄
            </h1>
            <p className="text-sm text-(--text-muted)">
              查看目前申請、借出與歷史借用紀錄。
            </p>
          </div>

          <ButtonLink href="/board-games" variant="outline" className="rounded-xl">
            瀏覽桌遊
          </ButtonLink>
        </header>

        <BorrowingStatusFilter status={status} pageSize={pageSize} />

        {borrowings.data.length === 0 ? (
          <EmptyState
            title={status ? `沒有${BORROWING_STATUS_LABEL[status]}紀錄` : "目前沒有借用紀錄"}
            description={
              status
                ? "可以切換其他狀態，或清除篩選查看全部紀錄。"
                : "前往桌遊頁面選擇想借用的桌遊後，即可提出借用申請。"
            }
          />
        ) : (
          <div className="space-y-3">
            {borrowings.data.map((borrowing) => (
              <BorrowingCard key={borrowing.id} borrowing={borrowing} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={borrowings.total}
          totalPages={borrowings.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={{ status }}
        />
      </div>
    </section>
  );
}

function BorrowingStatusFilter({
  status,
  pageSize,
}: {
  status?: BorrowingStatus;
  pageSize: number;
}) {
  return (
    <form
      action={BASE_PATH}
      className="card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <input type="hidden" name="pageSize" value={pageSize} />

      <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
        借用狀態
        <select
          name="status"
          defaultValue={status ?? ""}
          className="min-h-11 rounded-xl border border-(--border) bg-(--primary-background) px-3 text-base text-(--text-primary) outline-none focus:border-(--primary) sm:min-w-48 sm:text-sm"
        >
          <option value="">全部狀態</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn primary min-h-11 rounded-xl px-4">
          套用篩選
        </button>
        {status ? (
          <ButtonLink
            href={`${BASE_PATH}?pageSize=${pageSize}`}
            variant="outline"
            className="min-h-11 rounded-xl px-4"
          >
            清除篩選
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}

type BorrowingCardProps = {
  borrowing: Awaited<
    ReturnType<typeof boardGamesService.getBorrowingsByUserId>
  >["data"][number];
};

function BorrowingCard({ borrowing }: BorrowingCardProps) {
  const { board_game: boardGame } = borrowing;

  return (
    <article className="card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <BoardGameImage
          boardGame={boardGame}
          className="aspect-[4/3] w-full shrink-0 rounded-xl border border-(--border-default) object-cover sm:h-24 sm:w-32"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-(--text-primary)">
                {boardGame.name}
              </p>
              <p className="text-sm text-(--text-muted)">
                社產編號 #{boardGame.inventory_number}
              </p>
            </div>

            <BorrowingStatusBadge status={borrowing.status} />
          </div>

          <dl className="grid gap-3 text-sm text-(--text-muted) sm:grid-cols-3">
            <BorrowingDate label="申請時間" value={formatDate(borrowing.created_at)} />
            <BorrowingDate
              label="借出時間"
              value={borrowing.borrowed_at ? formatDate(borrowing.borrowed_at) : "尚未借出"}
            />
            <BorrowingDate
              label="應歸還時間"
              value={borrowing.due_at ? formatDate(borrowing.due_at) : "尚未設定"}
            />
          </dl>
        </div>
      </div>
    </article>
  );
}

function BorrowingDate({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide">{label}</dt>
      <dd className="mt-1 text-(--text-primary)">{value}</dd>
    </div>
  );
}

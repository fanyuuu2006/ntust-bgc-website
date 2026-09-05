import { BorrowingRecord } from "@/components/(authenticated)/borrowings/BorrowingRecord";
import { Pagination } from "@/components/Pagination/Pagination";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BorrowingStatus } from "@/types/database";

const BASE_PATH = "/borrowings";

export type BorrowingsResultQuery = {
  page: number;
  pageSize: number;
  status?: BorrowingStatus;
  search?: string;
  sort: string;
  orderBy: "created_at" | "due_at" | "returned_at";
  orderDirection: "asc" | "desc";
};

export async function BorrowingsResults({
  userId,
  query,
  pageSizeOptions,
}: {
  userId: string;
  query: BorrowingsResultQuery;
  pageSizeOptions: readonly number[];
}) {
  const borrowings = await boardGamesService.getBorrowingsByUserId(userId, {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    search: query.search,
    orderBy: query.orderBy,
    orderDirection: query.orderDirection,
  });

  return (
    <>
      {borrowings.data.length === 0 &&
      (query.search || query.status || query.page > 1) ? (
        <QueryEmptyState
          title="找不到符合條件的借用紀錄"
          description="試著調整搜尋或篩選條件。"
          clearHref={BASE_PATH}
        />
      ) : borrowings.data.length === 0 ? (
        <EmptyState
          title="目前沒有借用紀錄"
          description="你可以先瀏覽社團桌遊，找到想借用的桌遊後提出申請。"
          action={
            <ButtonLink href="/board-games" variant="outline">
              瀏覽桌遊
            </ButtonLink>
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
        page={query.page}
        pageSize={query.pageSize}
        total={borrowings.total}
        totalPages={borrowings.totalPages}
        basePath={BASE_PATH}
        pageSizeOptions={pageSizeOptions}
        query={{
          status: query.status,
          search: query.search,
          sort: query.sort,
        }}
        showPageSize={false}
      />
    </>
  );
}

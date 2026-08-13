import Link from "next/link";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { BoardGameImage } from "@/components/BoardGameImage";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { formatDate } from "@/utils/date";

export default async function BorrowingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const borrowings = await boardGamesService.getBorrowingsByUserId(user.id, {
    page: 1,
    pageSize: 50,
  });

  return (
    <section className="py-8">
      <div className="container">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-(--primary)">我的借用</p>
            <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">
              借用紀錄
            </h1>
          </div>

          <Link
            href="/board-games"
            className="btn outline inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium"
          >
            瀏覽可借桌遊
          </Link>
        </header>

        {borrowings.data.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center">
            <p className="text-base font-medium text-(--foreground)">
              目前沒有借用紀錄
            </p>
            <p className="mt-2 text-sm text-(--muted)">
              先看看可借桌遊，申請借用後就會出現在這裡。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {borrowings.data.map((borrowing) => {
              const { board_game: boardGame } = borrowing;

              return (
                <article
                  key={borrowing.id}
                  className="card rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <BoardGameImage
                      boardGame={boardGame}
                      className="h-20 w-20 shrink-0 rounded-xl border border-(--border) object-cover sm:h-24 sm:w-24"
                    />

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-(--foreground)">
                            {boardGame.name}
                          </p>
                          <p className="text-sm text-(--muted)">
                            館藏編號：{boardGame.inventory_number}
                          </p>
                        </div>

                        <BorrowingStatusBadge status={borrowing.status} />
                      </div>

                      <div className="grid gap-2 text-sm text-(--muted) sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide">申請時間</p>
                          <p className="mt-1 text-(--foreground)">
                            {formatDate(borrowing.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">借出日期</p>
                          <p className="mt-1 text-(--foreground)">
                            {borrowing.borrowed_at
                              ? formatDate(borrowing.borrowed_at)
                              : "尚未借出"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">預計歸還</p>
                          <p className="mt-1 text-(--foreground)">
                            {borrowing.due_at
                              ? formatDate(borrowing.due_at)
                              : "待安排"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

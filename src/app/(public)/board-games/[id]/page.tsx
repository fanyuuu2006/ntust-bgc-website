import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import { BorrowBoardGameForm } from "@/components/(public)/board-games/BorrowBoardGameForm";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { formatDate } from "@/utils/date";

type BoardGameDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BoardGameDetailPage({
  params,
}: BoardGameDetailPageProps) {
  const { id } = await params;

  let boardGame;

  try {
    boardGame = await boardGamesService.getBoardGameWithCategoryAndLocation(id);
  } catch (error) {
    if (error instanceof BoardNotFoundError) {
      notFound();
    }
    throw error;
  }

  const user = await getCurrentUser();

  return (
    <section className="py-8">
      <div className="container">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/board-games"
            className="btn outline inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium"
          >
            返回桌遊列表
          </Link>
        </div>

        <article className="card rounded-3xl p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--secondary-background)">
              <BoardGameImage
                boardGame={boardGame}
                className="h-72 w-full object-cover sm:h-80 lg:h-112"
              />
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <BoardGameStatusBadge status={boardGame.status} />
                  <span className="text-sm text-(--muted)">
                    館藏編號：{boardGame.inventory_number}
                  </span>
                </div>

                <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">
                  {boardGame.name}
                </h1>

                <div className="space-y-1 text-sm text-(--muted)">
                  <p>分類：{boardGame.category.name}</p>
                  <p>位置：{boardGame.location.name}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-(--border) bg-(--secondary-background) p-4">
                <p className="text-sm font-medium text-(--foreground)">桌遊介紹</p>
                <p className="mt-2 text-sm leading-relaxed text-(--muted)">
                  {boardGame.description || "此桌遊目前尚未填寫詳細介紹，歡迎與幹部聯繫了解更多資訊。"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-(--border) bg-(--secondary-background) p-3">
                  <p className="text-xs uppercase tracking-wide text-(--muted)">建立時間</p>
                  <p className="mt-1 text-sm font-medium text-(--foreground)">
                    {formatDate(boardGame.created_at)}
                  </p>
                </div>
                <div className="rounded-xl border border-(--border) bg-(--secondary-background) p-3">
                  <p className="text-xs uppercase tracking-wide text-(--muted)">更新時間</p>
                  <p className="mt-1 text-sm font-medium text-(--foreground)">
                    {formatDate(boardGame.updated_at)}
                  </p>
                </div>
              </div>

              {user ? (
                <div className="rounded-2xl border border-(--border) bg-(--primary-background) p-4">
                  <h2 className="text-base font-bold text-(--foreground)">借用申請</h2>
                  <p className="mt-2 text-sm text-(--muted)">
                    送出申請後，幹部將確認借用資格與狀態，請留意通知。
                  </p>
                  <div className="mt-4">
                    <BorrowBoardGameForm boardGameId={boardGame.id} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border) p-4 text-center">
                  <p className="text-sm text-(--muted)">請先登入後再申請借用。</p>
                  <Link
                    href="/login"
                    className="btn primary mt-3 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium"
                  >
                    前往登入
                  </Link>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

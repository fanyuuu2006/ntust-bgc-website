import { notFound } from "next/navigation";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BorrowBoardGameForm } from "@/components/(public)/board-games/BorrowBoardGameForm";
import { BoardGameStatusBadge } from "@/components/(public)/board-games/BoardGameStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
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
          <ButtonLink
            href="/board-games"
            variant="outline"
            className="rounded-xl"
          >
            返回桌遊社產
          </ButtonLink>
        </div>

        <article className="card rounded-3xl p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="overflow-hidden rounded-2xl border border-(--border-default) bg-(--surface-subtle)">
              <BoardGameImage
                boardGame={boardGame}
                className="aspect-4/3 w-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <BoardGameStatusBadge status={boardGame.status} />

                <h1 className="text-2xl font-bold text-(--text-primary) sm:text-3xl">
                  {boardGame.name}
                </h1>

                <div className="space-y-1 text-sm text-(--text-muted)">
                  <p>
                    {boardGame.category.name} · {boardGame.location.name}
                  </p>
                  <p>社產編號 #{String(boardGame.inventory_number).padStart(3, "0")}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-(--border-default) bg-(--surface-subtle) p-4">
                <p className="text-sm font-medium text-(--text-primary)">桌遊介紹</p>
                <p className="mt-2 text-sm leading-relaxed text-(--text-muted)">
                  {boardGame.description || "此桌遊目前尚未填寫詳細介紹。"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-(--border-default) bg-(--surface-subtle) p-3">
                  <p className="text-xs uppercase tracking-wide text-(--text-muted)">建立時間</p>
                  <p className="mt-1 text-sm font-medium text-(--text-primary)">
                    {formatDate(boardGame.created_at)}
                  </p>
                </div>
                <div className="rounded-xl border border-(--border-default) bg-(--surface-subtle) p-3">
                  <p className="text-xs uppercase tracking-wide text-(--text-muted)">更新時間</p>
                  <p className="mt-1 text-sm font-medium text-(--text-primary)">
                    {formatDate(boardGame.updated_at)}
                  </p>
                </div>
              </div>

              {user ? (
                <div className="rounded-2xl border border-(--border-default) bg-(--surface-default) p-4">
                  <h2 className="text-base font-bold text-(--text-primary)">借用這款桌遊</h2>
                  <p className="mt-2 text-sm text-(--text-muted)">
                    送出申請後請等待幹部審核。核准後，請於領取桌遊時完成費用繳交。
                  </p>
                  <div className="mt-4">
                    <BorrowBoardGameForm boardGameId={boardGame.id} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border-default) p-4 text-center">
                  <h2 className="text-base font-bold text-(--text-primary)">想借這款桌遊？</h2>
                  <p className="mt-2 text-sm text-(--text-muted)">登入帳號後即可提出借用申請。</p>
                  <ButtonLink
                    href="/login"
                    className="mt-3 rounded-xl"
                  >
                    登入
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

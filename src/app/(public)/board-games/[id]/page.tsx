import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BorrowBoardGameForm } from "@/components/(public)/board-games/BorrowBoardGameForm";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { formatDate } from "@/utils/date";

type BoardGameDetailPageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_META = {
  available: { label: "可借用", dotClass: "bg-(--game-green)" },
  borrowed: { label: "借用中", dotClass: "bg-(--game-blue)" },
  maintenance: { label: "維護中", dotClass: "bg-(--game-yellow)" },
  lost: { label: "遺失", dotClass: "bg-(--game-red)" },
  damaged: { label: "損壞", dotClass: "bg-(--game-red)" },
  retired: { label: "已除役", dotClass: "bg-(--muted)" },
} as const;

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
  const status = STATUS_META[boardGame.status];

  return (
    <section className="py-8">
      <div className="container">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/board-games"
            className="btn outline inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium"
          >
            返回桌遊館藏
          </Link>
        </div>

        <article className="card rounded-3xl p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--secondary-background)">
              <BoardGameImage
                boardGame={boardGame}
                className="aspect-4/3 w-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-(--foreground)">
                  <span className={`h-2 w-2 rounded-full ${status.dotClass}`} aria-hidden />
                  {status.label}
                </div>

                <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">
                  {boardGame.name}
                </h1>

                <div className="space-y-1 text-sm text-(--muted)">
                  <p>
                    {boardGame.category.name} · {boardGame.location.name}
                  </p>
                  <p>館藏編號 #{String(boardGame.inventory_number).padStart(3, "0")}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-(--border) bg-(--secondary-background) p-4">
                <p className="text-sm font-medium text-(--foreground)">桌遊介紹</p>
                <p className="mt-2 text-sm leading-relaxed text-(--muted)">
                  {boardGame.description || "此桌遊目前尚未填寫詳細介紹。"}
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
                  <h2 className="text-base font-bold text-(--foreground)">借用這款桌遊</h2>
                  <p className="mt-2 text-sm text-(--muted)">
                    送出申請後請等待幹部審核。核准後，請於領取桌遊時完成費用繳交。
                  </p>
                  <div className="mt-4">
                    <BorrowBoardGameForm boardGameId={boardGame.id} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-(--border) p-4 text-center">
                  <h2 className="text-base font-bold text-(--foreground)">想借這款桌遊？</h2>
                  <p className="mt-2 text-sm text-(--muted)">登入帳號後即可提出借用申請。</p>
                  <Link
                    href="/login"
                    className="btn primary mt-3 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium"
                  >
                    登入
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

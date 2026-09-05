import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { BoardGameBorrowingPanel } from "@/components/(public)/board-games/BoardGameBorrowingPanel";
import { BoardGameStatusBadge } from "@/components/(public)/board-games/BoardGameStatusBadge";
import { BoardGameImage } from "@/components/BoardGameImage";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/libs/auth";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { membershipService } from "@/services/memberships/memberships.service";

type BoardGameDetailPageProps = { params: Promise<{ id: string }> };

export default async function BoardGameDetailPage({
  params,
}: BoardGameDetailPageProps) {
  const { id } = await params;
  let boardGame;

  try {
    boardGame = await boardGamesService.getBoardGameWithCategoryAndLocation(id);
  } catch (error) {
    if (error instanceof BoardNotFoundError) notFound();
    throw error;
  }

  const user = await getCurrentUser();
  const [currentMembership, existingBorrowing] = user
    ? await Promise.all([
        membershipService.getCurrentMembershipByUserId(user.id),
        boardGamesService.getOpenBorrowingForUserAndBoardGame(
          user.id,
          boardGame.id,
        ),
      ])
    : [null, null];
  const description = boardGame.description?.trim();

  return (
    <section className="py-6 sm:py-8">
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <ButtonLink
            href="/board-games"
            variant="text"
            size="sm"
            className="mb-4 px-0 sm:mb-5"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            返回桌遊列表
          </ButtonLink>

          <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-(--border-default) bg-(--surface-subtle)">
              <BoardGameImage
                boardGame={boardGame}
                className={
                  boardGame.image
                    ? "h-full w-full object-contain"
                    : "h-full w-full object-contain p-[22%] opacity-60"
                }
              />
            </div>

            <div className="min-w-0 space-y-4">
              <header className="min-w-0 space-y-2">
                <BoardGameStatusBadge status={boardGame.status} />
                <h1 className="break-words text-2xl leading-tight font-semibold text-(--text-primary) sm:text-3xl">
                  {boardGame.name}
                </h1>
              </header>

              <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 py-1 text-sm">
                <dt className="text-(--text-muted)">分類</dt>
                <dd className="min-w-0 break-words font-medium text-(--text-primary)">
                  {boardGame.category.name}
                </dd>
                <dt className="text-(--text-muted)">位置</dt>
                <dd className="min-w-0 break-words font-medium text-(--text-primary)">
                  {boardGame.location.name}
                </dd>
                <dt className="text-(--text-muted)">社產編號</dt>
                <dd className="min-w-0 break-words font-medium text-(--text-primary)">
                  #{String(boardGame.inventory_number).padStart(3, "0")}
                </dd>
              </dl>

              <BoardGameBorrowingPanel
                status={boardGame.status}
                isAuthenticated={Boolean(user)}
                isCurrentAcademicYearMember={Boolean(currentMembership)}
                existingBorrowing={existingBorrowing}
                boardGameId={boardGame.id}
                boardGameName={boardGame.name}
              />
            </div>
          </div>

          <section
            className="mt-8 max-w-4xl border-t border-(--border-muted) pt-6"
            aria-labelledby="board-game-description"
          >
            <h2
              id="board-game-description"
              className="text-xl font-semibold text-(--text-primary)"
            >
              桌遊介紹
            </h2>
            <p className="mt-3 break-words whitespace-pre-wrap text-base leading-7 text-(--text-secondary) [overflow-wrap:anywhere]">
              {description || "目前尚未補充這款桌遊的介紹。"}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}

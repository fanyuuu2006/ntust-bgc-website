import { notFound } from "next/navigation";
import { ArrowLeft, Info, PackageOpen } from "lucide-react";

import { BoardGameImage } from "@/components/BoardGameImage";
import { BorrowBoardGameForm } from "@/components/(public)/board-games/BorrowBoardGameForm";
import {
  BoardGameStatusBadge,
  BOARD_GAME_STATUS_LABEL,
} from "@/components/(public)/board-games/BoardGameStatusBadge";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/libs/auth";
import { clubPolicies } from "@/libs/clubPolicies";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { membershipService } from "@/services/memberships/memberships.service";
import type { BoardGameBorrowing, BoardGameStatus } from "@/types/database";

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
        boardGamesService.getOpenBorrowingForUserAndBoardGame(user.id, boardGame.id),
      ])
    : [null, null];

  return (
    <section className="py-8">
      <div className="container max-w-5xl">
        <ButtonLink
          href="/board-games"
          variant="text"
          size="sm"
          className="mb-4 px-0"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          返回桌遊列表
        </ButtonLink>

        <Card className="p-4 sm:p-6 lg:p-8">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="overflow-hidden rounded-2xl border border-(--border-default) bg-(--surface-subtle)">
              <BoardGameImage
                boardGame={boardGame}
                className="aspect-4/3 w-full object-cover"
              />
            </div>

            <div className="min-w-0 space-y-6">
              <header className="space-y-3">
                <BoardGameStatusBadge status={boardGame.status} />
                <h1 className="text-2xl font-semibold text-(--text-primary) sm:text-3xl">
                  {boardGame.name}
                </h1>
                <div className="space-y-1 text-sm text-(--text-muted)">
                  <p>{boardGame.category.name} · {boardGame.location.name}</p>
                  <p>社產編號 #{String(boardGame.inventory_number).padStart(3, "0")}</p>
                </div>
              </header>

              <BorrowingCallout
                status={boardGame.status}
                isAuthenticated={Boolean(user)}
                isCurrentAcademicYearMember={Boolean(currentMembership)}
                existingBorrowing={existingBorrowing}
                boardGameId={boardGame.id}
              />

              <section
                className="border-t border-(--border-muted) pt-5"
                aria-labelledby="board-game-description"
              >
                <h2
                  id="board-game-description"
                  className="flex items-center gap-2 text-base font-semibold text-(--text-primary)"
                >
                  <PackageOpen
                    aria-hidden="true"
                    className="size-4 text-(--interactive-primary)"
                  />
                  桌遊介紹
                </h2>
                <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                  {boardGame.description || "目前尚未提供這款桌遊的介紹。"}
                </p>
              </section>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function BorrowingCallout({
  status,
  isAuthenticated,
  isCurrentAcademicYearMember,
  existingBorrowing,
  boardGameId,
}: {
  status: BoardGameStatus;
  isAuthenticated: boolean;
  isCurrentAcademicYearMember: boolean;
  existingBorrowing: BoardGameBorrowing | null;
  boardGameId: string;
}) {
  if (status !== "available") {
    return (
      <section className="border-t border-(--border-muted) pt-5">
        <h2 className="text-base font-semibold text-(--text-primary)">目前無法借用</h2>
        <p className="mt-2 text-sm text-(--text-muted)">
          這款桌遊目前為「{BOARD_GAME_STATUS_LABEL[status]}」，暫時無法申請借用。
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="border-t border-(--border-muted) pt-5">
        <h2 className="text-base font-semibold text-(--text-primary)">申請借用</h2>
        <p className="mt-2 text-sm text-(--text-muted)">登入後即可送出借用申請。</p>
        <ButtonLink
          href={`/login?returnTo=${encodeURIComponent(`/board-games/${boardGameId}`)}`}
          className="mt-4"
          size="sm"
        >
          登入後申請借用
        </ButtonLink>
      </section>
    );
  }

  if (existingBorrowing) {
    return (
      <section className="border-t border-(--border-muted) pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-(--text-primary)">你已有進行中的借用</h2>
          <BorrowingStatusBadge status={existingBorrowing.status} />
        </div>
        <p className="mt-2 text-sm text-(--text-muted)">
          {getExistingBorrowingMessage(existingBorrowing.status)}
        </p>
        <ButtonLink href="/borrowings" variant="text" size="sm" className="mt-3 px-0">
          查看我的借用
        </ButtonLink>
      </section>
    );
  }

  return (
    <section className="border-t border-(--border-muted) pt-5">
      <h2 className="text-base font-semibold text-(--text-primary)">申請借用</h2>
      <p className="mt-2 text-sm text-(--text-muted)">
        送出申請後，將由幹部確認借用安排。
      </p>
      {!isCurrentAcademicYearMember ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 text-sm leading-6 text-(--text-secondary)">
          <Info
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-(--status-info)"
          />
          {clubPolicies.nonCurrentAcademicYearMemberBorrowingNotice}
        </p>
      ) : null}
      <div className="mt-4">
        <BorrowBoardGameForm boardGameId={boardGameId} />
      </div>
    </section>
  );
}

function getExistingBorrowingMessage(status: BoardGameBorrowing["status"]) {
  if (status === "pending") return "借用申請正在等待幹部確認。";
  if (status === "approved") return "借用已核准，請等待幹部確認借出。";
  return "這款桌遊目前已在你的借用中。";
}

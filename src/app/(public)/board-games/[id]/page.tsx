import { withServerErrorReference } from "@/libs/observability/server-render";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { BoardGameBorrowingPanel } from "@/components/(public)/board-games/BoardGameBorrowingPanel";
import { BoardGameStatusBadge } from "@/components/(public)/board-games/BoardGameStatusBadge";
import { BoardGameImage } from "@/components/BoardGameImage";
import { ButtonLink } from "@/components/ui/Button";
import {
  createMetadataDescription,
  createMetadataTitle,
  getSafeMetadataImageUrl,
} from "@/libs/metadata-content";
import { resolvePublicViewer } from "@/libs/public-viewer";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { cn } from "@/utils/className";
import { getBoardGameDetail } from "./board-game-detail";

type BoardGameDetailPageProps = { params: Promise<{ id: string }> };

async function generateMetadataContent({
  params,
}: BoardGameDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const boardGame = await getBoardGameDetail(id);
  const normalizedName = createMetadataDescription(boardGame.name);
  const title = createMetadataTitle(normalizedName);
  const description = createMetadataDescription(
    boardGame.description?.trim() ||
      `查看「${normalizedName}」的分類、位置與借用資訊。`,
  );
  const canonical = `/board-games/${boardGame.id}`;
  const image = getSafeMetadataImageUrl(boardGame.image);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image, alt: normalizedName }] } : {}),
    },
  };
}

async function BoardGameDetailPage({
  params,
}: BoardGameDetailPageProps) {
  const { id } = await params;
  const boardGame = await getBoardGameDetail(id);

  const viewer = await resolvePublicViewer();
  const user = viewer.status === "resolved" ? viewer.user : null;
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
    <section className="py-8">
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <ButtonLink
            href="/board-games"
            variant="text"
            size="sm"
            className="px-0"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            返回桌遊列表
          </ButtonLink>

          <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div
              className={cn(
                "relative aspect-4/3 overflow-hidden rounded-2xl border",
                boardGame.image
                  ? "border-(--border-muted) bg-(--surface-default)"
                  : "border-(--border-default) bg-(--surface-subtle)",
              )}
            >
              <BoardGameImage
                boardGame={boardGame}
                className={
                  boardGame.image
                    ? "h-full w-full object-contain"
                    : "h-full w-full object-contain p-[22%] opacity-60"
                }
              />
            </div>

            <div className="min-w-0">
              <header className="min-w-0 space-y-2">
                <BoardGameStatusBadge status={boardGame.status} />
                <h1 className="wrap-anywhere text-2xl leading-tight font-semibold text-(--text-primary) sm:text-3xl">
                  {boardGame.name}
                </h1>
              </header>

              <dl className="mt-5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 py-1 text-sm">
                <dt className="text-(--text-muted)">分類</dt>
                <dd className="min-w-0 wrap-anywhere font-medium text-(--text-primary)">
                  {boardGame.category.name}
                </dd>
                <dt className="text-(--text-muted)">位置</dt>
                <dd className="min-w-0 wrap-anywhere font-medium text-(--text-primary)">
                  {boardGame.location.name}
                </dd>
                <dt className="text-(--text-muted)">社產編號</dt>
                <dd className="min-w-0 wrap-anywhere font-medium text-(--text-primary)">
                  #{boardGame.inventory_number}
                </dd>
              </dl>

              <div className="mt-5">
                {viewer.status === "unavailable" ? (
                  <div
                    role="status"
                    className="rounded-xl border border-(--border-default) bg-(--surface-subtle) p-4 text-sm leading-6 text-(--text-muted)"
                  >
                    目前暫時無法確認登入狀態，請稍後重新整理後再試。
                  </div>
                ) : (
                  <BoardGameBorrowingPanel
                    status={boardGame.status}
                    isAuthenticated={Boolean(user)}
                    isCurrentAcademicYearMember={Boolean(currentMembership)}
                    existingBorrowing={existingBorrowing}
                    boardGameId={boardGame.id}
                    boardGameName={boardGame.name}
                  />
                )}
              </div>
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
            <p className="mt-3 wrap-anywhere whitespace-pre-wrap text-base leading-7 text-(--text-secondary) [overflow-wrap:anywhere]">
              {description || "目前尚未補充這款桌遊的介紹。"}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/board-games/[id]");
export default withServerErrorReference(BoardGameDetailPage, "/board-games/[id]");

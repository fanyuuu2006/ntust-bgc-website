import { RichTextRenderer } from "@/components/RichTextRenderer";
import { storedDescription } from "@/libs/rich-content/description";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { BoardGameBorrowingPanel } from "@/components/(public)/board-games/BoardGameBorrowingPanel";
import { BoardGameStatusBadge } from "@/components/(public)/board-games/BoardGameStatusBadge";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BoardGameReviews } from "@/components/(public)/board-games/BoardGameReviews";
import { ReviewAuthorAction } from "@/components/(public)/board-games/ReviewAuthorAction";
import { ButtonLink } from "@/components/ui/Button";
import {
  createMetadataDescription,
  createMetadataTitle,
  getSafeMetadataImageUrl,
} from "@/libs/metadata-content";
import { resolvePublicViewer } from "@/libs/public-viewer";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { reviewsService } from "@/services/reviews/reviews.service";
import { cn } from "@/utils/className";
import { buildQueryString } from "@/utils/url";
import { redirect } from "next/navigation";
import { getBoardGameDetail } from "./board-game-detail";
import { normalizeBoardGameReviewQuery, type BoardGameReviewSearchParams } from "./review-query";
import { normalizeBoardGameDiscoveryReturnTo } from "../discovery-return";

type BoardGameDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<BoardGameReviewSearchParams>;
};

async function generateMetadataContent({
  params,
  searchParams,
}: BoardGameDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const reviewQuery = normalizeBoardGameReviewQuery((await searchParams) ?? {});
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
    ...(reviewQuery.page > 1 || reviewQuery.sort !== "newest"
      ? { robots: { index: false, follow: true } }
      : {}),
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
  searchParams,
}: BoardGameDetailPageProps) {
  const { id } = await params;
  const boardGame = await getBoardGameDetail(id);
  const rawSearchParams = (await searchParams) ?? {};
  const reviewQuery = normalizeBoardGameReviewQuery(rawSearchParams);
  const returnTo = normalizeBoardGameDiscoveryReturnTo(
    Array.isArray(rawSearchParams.returnTo)
      ? rawSearchParams.returnTo[0]
      : rawSearchParams.returnTo,
  );

  const [viewer, reviewAggregate, reviews] = await Promise.all([
    resolvePublicViewer(),
    reviewsService.getAggregate(boardGame.id),
    reviewsService.listPublic(boardGame.id, reviewQuery),
  ]);

  if (reviews.totalPages > 0 && reviewQuery.page > reviews.totalPages) {
    redirect(`/board-games/${boardGame.id}?${buildQueryString({
      reviewPage: reviews.totalPages,
      reviewSort: reviewQuery.sort === "newest" ? undefined : reviewQuery.sort,
      returnTo: returnTo === "/board-games" ? undefined : returnTo,
    })}`);
  }

  const user = viewer.status === "resolved" ? viewer.user : null;
  const [currentMembership, existingBorrowing, ownReview] = user
    ? await Promise.all([
        membershipService.getCurrentMembershipByUserId(user.id),
        boardGamesService.getOpenBorrowingForUserAndBoardGame(
          user.id,
          boardGame.id,
        ),
        user.email_verified_at ? reviewsService.findOwn(user.id, boardGame.id) : Promise.resolve(null),
      ])
    : [null, null, null];

  return (
    <section className="py-8">
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <ButtonLink
            href={returnTo}
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
            <RichTextRenderer {...storedDescription(boardGame)} content={boardGame.description || "目前尚未補充這款桌遊的介紹。"} className="mt-3" />
          </section>

          <BoardGameReviews
            boardGameId={boardGame.id}
            aggregate={reviewAggregate}
            reviews={reviews}
            sort={reviewQuery.sort}
            returnTo={returnTo === "/board-games" ? undefined : returnTo}
            authorAction={<ReviewAuthorAction boardGameId={boardGame.id} ownReview={ownReview} eligibility={viewer.status === "unavailable" ? "unavailable" : !user ? "anonymous" : !user.email_verified_at ? "unverified" : "verified"} />}
          />
        </div>
      </div>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/board-games/[id]");
export default withServerErrorReference(BoardGameDetailPage, "/board-games/[id]");

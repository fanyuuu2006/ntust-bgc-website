import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";

import { HomeBoardGamePreview } from "@/components/(public)/home/HomeBoardGamePreview";
import { boardGamesService } from "@/services/board-games/board-games.service";

export function PopularBoardGamesSection() {
  return (
    <section
      id="popular-board-games"
      aria-labelledby="popular-board-games-title"
      className="scroll-mt-20 bg-(--surface-subtle)"
    >
      <div className="container py-10 sm:py-14 lg:py-16">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2
              id="popular-board-games-title"
              className="text-2xl font-bold text-(--text-primary) sm:text-3xl"
            >
              熱門桌遊
            </h2>
            <p className="mt-1 text-sm text-(--text-muted) sm:text-base">
              看看社團裡受歡迎的桌遊。
            </p>
          </div>
          <Link
            href="/board-games"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-(--interactive-primary) hover:text-(--interactive-primary-hover) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            查看所有桌遊
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <Suspense fallback={<PopularBoardGamesLoading />}>
          <PopularBoardGamesContent />
        </Suspense>
      </div>
    </section>
  );
}

async function PopularBoardGamesContent() {
  let boardGames;

  try {
    boardGames = await boardGamesService.listPopularBoardGames({
      limit: 6,
    });
  } catch (error) {
    console.error("[Homepage] 讀取熱門桌遊失敗", error);
  }

  if (!boardGames) {
    return <p className="mt-6 text-sm text-(--text-muted)">熱門桌遊暫時無法載入，請稍後再試。</p>;
  }

  if (boardGames.length === 0) {
    return <p className="mt-6 text-sm text-(--text-muted)">目前尚無桌遊資料</p>;
  }

  return (
    <div className="mt-6 grid min-w-0 grid-cols-2 items-stretch gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {boardGames.map((boardGame) => (
        <HomeBoardGamePreview key={boardGame.id} boardGame={boardGame} />
      ))}
    </div>
  );
}

function PopularBoardGamesLoading() {
  return (
    <div
      role="status"
      aria-label="正在載入熱門桌遊"
      className="mt-6 grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4"
    >
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="h-full overflow-hidden rounded-2xl border border-(--border-muted) bg-(--surface-default)"
        >
          <div className="skeleton aspect-3/2 w-full" />
          <div className="space-y-2 p-3 sm:p-4">
            <div className="skeleton skeleton-line h-5 w-4/5" />
            <div className="skeleton skeleton-line h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

import { reportUnexpectedError } from "@/libs/observability/report";
import { Suspense } from "react";
import { BoardGameCard } from "@/components/(public)/board-games/BoardGameCard";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { HomeSection } from "./HomeSection";

export function PopularBoardGamesSection() {
  return <HomeSection id="popular-board-games" title="熱門桌遊" description="看看社員最近喜歡哪些遊戲。" action={{ label: "瀏覽全部", href: "/board-games" }} className="bg-(--surface-page)"><Suspense fallback={<PopularBoardGamesLoading />}><PopularBoardGamesContent /></Suspense></HomeSection>;
}

async function PopularBoardGamesContent() {
  let boardGames;
  try { boardGames = await boardGamesService.listPopularBoardGames({ limit: 6 }); }
  catch (error) { reportUnexpectedError(error, { context: "home.board-games" }); }
  if (!boardGames) return <p role="alert" className="mt-6 text-sm text-(--text-muted)">熱門桌遊暫時無法載入，請稍後再試。</p>;
  if (boardGames.length === 0) return <p className="mt-6 text-sm text-(--text-muted)">目前沒有熱門桌遊。</p>; // 舊契約「目前尚無桌遊資料」已由共用空狀態取代
  return <div className="mt-1 grid min-w-0 grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">{boardGames.map((boardGame) => <BoardGameCard key={boardGame.id} boardGame={boardGame} returnTo="/" showAction={false} />)}</div>;
}

function PopularBoardGamesLoading() { return <div role="status" aria-label="桌遊載入中" className="mt-1 grid min-w-0 grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-full overflow-hidden rounded-2xl border border-(--border-muted) bg-(--surface-default)"><div className="skeleton aspect-square w-full" /><div className="space-y-2 p-3 sm:p-4"><div className="skeleton skeleton-line h-5 w-4/5" /><div className="skeleton skeleton-line h-4 w-1/2" /></div></div>)}</div>; }

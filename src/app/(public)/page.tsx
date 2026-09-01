import Link from "next/link";

import { BoardGameGrid } from "@/components/(public)/board-games/BoardGameGrid";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function HomePage() {
  const featuredGames = await boardGamesService.listBoardGamesWithCategoryAndLocation({
    page: 1,
    pageSize: 4,
    status: "available",
    orderBy: "updated_at",
    orderDirection: "desc",
  });

  return (
    <div>
      <section className="border-b border-(--border) bg-(--primary-background)">
        <div className="container grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold tracking-wide text-(--primary)">NTUST BOARD GAME CLUB</p>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-(--foreground) sm:text-5xl">在一局桌遊裡，認識更多同好。</h1>
            <p className="max-w-2xl text-base leading-7 text-(--muted)">國立臺灣科技大學桌上遊戲研究社的活動資訊、社產查詢與社員服務，都在這裡。</p>
            <div className="flex flex-wrap gap-3"><Link href="/board-games" className="btn primary rounded-xl px-5 py-3 font-semibold">探索桌遊</Link><Link href="/register" className="btn outline rounded-xl px-5 py-3 font-semibold">加入社團</Link></div>
          </div>
          <div className="card grid grid-cols-2 gap-3 rounded-3xl p-5 sm:p-7" aria-label="社團服務">
            {[["桌遊社產", "查詢與借用流程"], ["社員資格", "線上啟用與查詢"], ["社課活動", "掌握活動資訊"], ["管理後台", "幹部日常管理"]].map(([title, text]) => <div key={title} className="rounded-2xl bg-(--secondary-background) p-4"><p className="font-bold text-(--foreground)">{title}</p><p className="mt-1 text-sm text-(--muted)">{text}</p></div>)}
          </div>
        </div>
      </section>
      <section className="container space-y-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">可借用桌遊</h2><p className="mt-1 text-sm text-(--muted)">看看社團目前可申請借用的社產。</p></div><Link href="/board-games" className="btn outline rounded-lg px-4 py-2 text-sm">查看全部</Link></div>
        <BoardGameGrid boardGames={featuredGames.data} hasActiveQuery={false} />
      </section>
    </div>
  );
}

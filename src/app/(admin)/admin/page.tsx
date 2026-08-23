import Link from "next/link";

import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { QuickStats } from "@/components/QuickStats";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function AdminPage() {
  const [totalGames, availableGames, borrowedGames, pendingBorrowings] = await Promise.all([
    boardGamesService.countAllBoardGames(), boardGamesService.countBoardGamesByStatus("available"), boardGamesService.countBoardGamesByStatus("borrowed"), boardGamesService.countBorrowingsByStatus("pending"),
  ]);
  return <><HeadingSection title="管理後台" description="掌握社產與借用流程，快速前往日常管理工作。" /><section className="space-y-6 px-4 pb-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><QuickStats stats={[{ key: "total", label: "社產總數", value: totalGames }, { key: "available", label: "可借用桌遊", value: availableGames, accent: "green" }, { key: "borrowed", label: "借出中", value: borrowedGames, accent: "primary" }, { key: "pending", label: "待審核申請", value: pendingBorrowings, accent: "yellow" }]} /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["桌遊管理", "新增、編輯社產與查詢狀態", "/admin/board-games"], ["借用管理", "審核申請、確認借出與歸還", "/admin/board-games/borrowings"], ["社員管理", "查看社員資料與註冊碼", "/admin/members"] as const].map(([title, description, href]) => <Link key={href} href={href} className="card rounded-2xl p-5"><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm text-(--muted)">{description}</p><span className="mt-4 inline-block text-sm font-semibold text-(--primary)">前往管理 →</span></Link>)}</div></section></>;
}

import Link from "next/link";

import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { QuickStats } from "@/components/QuickStats";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { eventsService } from "@/services/events/events.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { formatDate } from "@/utils/date";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [membership, borrowings, borrowedCount, attendedCount, events] = await Promise.all([
    membershipService.getCurrentMembershipByUserId(user.id),
    boardGamesService.getBorrowingsByUserId(user.id, { page: 1, pageSize: 5 }),
    boardGamesService.getCurrentlyBorrowedCount(user.id),
    eventsService.getAttendedCountByCurrentAcademicYear(user.id),
    eventsService.getUpcomingEvents(3),
  ]);
  const activeBorrowings = borrowings.data.filter(({ status }) => ["pending", "approved", "borrowed"].includes(status));
  const membershipLabel = membership
    ? membership.type === "lifetime"
      ? "永久社員"
      : "當前社員"
    : "未啟用";
  return <section className="container space-y-7 py-8"><header><p className="text-sm font-semibold text-(--primary)">歡迎回來，{user.name}</p><h1 className="mt-1 text-3xl font-bold">社員儀表板</h1></header>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><QuickStats stats={[{ key: "membership", label: "目前社員資格", value: membershipLabel, accent: membership ? "supporting" : "highlight" }, { key: "borrowing", label: "借出中的桌遊", value: borrowedCount, accent: "primary" }, { key: "pending", label: "進行中的申請", value: activeBorrowings.length, accent: "highlight" }, { key: "attendance", label: "本學年出席", value: attendedCount, accent: "supporting" }]} /></div>
    <div className="grid gap-5 lg:grid-cols-2"><section className="card rounded-2xl p-5"><div className="flex items-center justify-between"><h2 className="font-bold">我的借用</h2><Link href="/borrowings" className="text-sm font-medium text-(--primary)">查看全部</Link></div><div className="mt-4 space-y-3">{activeBorrowings.length ? activeBorrowings.map((borrowing) => <div key={borrowing.id} className="flex items-center justify-between gap-3 rounded-xl bg-(--secondary-background) p-3"><div className="min-w-0"><p className="truncate font-medium">{borrowing.board_game.name}</p><p className="text-xs text-(--muted)">社產編號 #{borrowing.board_game.inventory_number}</p></div><BorrowingStatusBadge status={borrowing.status} /></div>) : <p className="rounded-xl bg-(--secondary-background) p-4 text-sm text-(--muted)">目前沒有進行中的借用。<Link className="ml-1 text-(--primary)" href="/board-games">前往探索桌遊</Link></p>}</div></section>
      <section className="card rounded-2xl p-5"><h2 className="font-bold">近期活動</h2><div className="mt-4 space-y-3">{events.length ? events.map((event) => <div key={event.id} className="rounded-xl bg-(--secondary-background) p-3"><p className="font-medium">{event.name}</p><p className="mt-1 text-xs text-(--muted)">{formatDate(event.start_time)}</p></div>) : <p className="rounded-xl bg-(--secondary-background) p-4 text-sm text-(--muted)">近期尚無已排定的活動。</p>}</div></section></div>
  </section>;
}

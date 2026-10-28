import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, ClipboardCheck, PackageOpen } from "lucide-react";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { PageHeader } from "@/components/PageHeader";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { eventsService } from "@/services/events/events.service";
import { AdminAttentionQueue, AdminQuickLinks } from "@/components/(admin)/admin/AdminAttentionQueue";

async function getAdminEventSnapshot() {
  try {
    const [upcoming, draft] = await Promise.all([
      eventsService.getEvents({ page: 1, pageSize: 3, status: "upcoming", orderBy: "start_time", orderDirection: "asc" }),
      eventsService.getEvents({ page: 1, pageSize: 1, publicationStatus: "draft", orderBy: "created_at", orderDirection: "desc" }),
    ]);
    return { upcoming, draftCount: draft.total };
  } catch {
    return { upcoming: { data: [] }, draftCount: 0 };
  }
}

async function AdminPage() {
  const [totalGames, pendingBorrowings, approvedBorrowings, borrowedGames, overdueBorrowings, eventSnapshot] = await Promise.all([
    boardGamesService.countAllBoardGames(), boardGamesService.countBorrowingsByStatus("pending"), boardGamesService.countBorrowingsByStatus("approved"), boardGamesService.countBorrowingsByStatus("borrowed"), boardGamesService.countOverdueBorrowings(), getAdminEventSnapshot(),
  ]);

  return <section className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <PageHeader title="管理總覽" description="先處理需要行動的工作，再查看近期營運狀態。" />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <AdminAttentionQueue pendingBorrowings={pendingBorrowings} overdueBorrowings={overdueBorrowings} draftEvents={eventSnapshot.draftCount} />
      <section aria-labelledby="admin-upcoming-events-title" className="min-w-0">
        <div className="flex items-center justify-between gap-3"><h2 id="admin-upcoming-events-title" className="text-base font-semibold text-(--text-primary)">近期活動</h2><Link href="/admin/events" className="text-sm font-medium text-(--interactive-primary) hover:underline">查看全部</Link></div>
        <div className="mt-3 divide-y divide-(--border-muted) border-y border-(--border-muted)">{eventSnapshot.upcoming.data.length ? eventSnapshot.upcoming.data.map((event) => <Link key={event.id} href={`/admin/events/${event.id}`} className="block py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"><p className="wrap-break-word text-sm font-medium text-(--text-primary)">{event.name}</p><p className="mt-1 text-xs text-(--text-muted)">{new Date(event.start_time).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" })}</p></Link>) : <p className="py-4 text-sm text-(--text-muted)">目前沒有近期活動。</p>}</div>
      </section>
    </div>
    <AdminQuickLinks />
    <section aria-labelledby="admin-status-title" className="space-y-3">
      <div className="flex items-center gap-2"><BarChart3 aria-hidden="true" className="size-5 text-(--text-muted)" /><h2 id="admin-status-title" className="text-base font-semibold text-(--text-primary)">營運概況</h2></div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-y border-(--border-muted) py-3 text-sm sm:grid-cols-4"><StatusItem label="桌遊總數" value={totalGames} href="/admin/board-games" icon={PackageOpen} /><StatusItem label="等待領取" value={approvedBorrowings} href="/admin/board-games/borrowings?page=1&status=approved" icon={ClipboardCheck} /><StatusItem label="借出中" value={borrowedGames} href="/admin/board-games/borrowings?page=1&status=borrowed" icon={PackageOpen} /><StatusItem label="活動草稿" value={eventSnapshot.draftCount} href="/admin/events?publication_status=draft" icon={CalendarDays} /></div>
    </section>
  </section>;
}

function StatusItem({ label, value, href, icon: Icon }: { label: string; value: number; href: string; icon: typeof PackageOpen }) {
  return <Link href={href} className="group flex min-w-0 items-center gap-2 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"><Icon aria-hidden="true" className="size-4 shrink-0 text-(--text-muted) group-hover:text-(--interactive-primary)" /><span className="min-w-0"><span className="block text-xs text-(--text-muted)">{label}</span><strong className="tabular-nums text-(--text-primary)">{value}</strong></span><ArrowRight aria-hidden="true" className="ml-auto size-3.5 text-(--text-muted)" /></Link>;
}

export default withServerErrorReference(AdminPage, "/admin");

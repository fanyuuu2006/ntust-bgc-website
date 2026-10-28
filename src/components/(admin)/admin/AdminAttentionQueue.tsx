import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, ClockAlert, FileText, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

type QueueItem = { label: string; value: number; href: string; tone: "warning" | "danger" | "info" };

export function AdminAttentionQueue({ pendingBorrowings, overdueBorrowings, draftEvents }: { pendingBorrowings: number; overdueBorrowings: number; draftEvents: number }) {
  const items: QueueItem[] = [
    { label: "待處理借用申請", value: pendingBorrowings, href: "/admin/board-games/borrowings?page=1&status=pending&orderBy=created_at&orderDirection=asc", tone: "warning" },
    { label: "逾期借用", value: overdueBorrowings, href: "/admin/board-games/borrowings?page=1&status=borrowed&overdue=true&orderBy=due_at&orderDirection=asc", tone: "danger" },
    { label: "活動草稿", value: draftEvents, href: "/admin/events?publication_status=draft", tone: "info" },
  ];
  return <Card className="p-4"><section aria-labelledby="admin-attention-title"><div className="flex items-center justify-between gap-3"><div><h2 id="admin-attention-title" className="font-semibold text-(--text-primary)">待處理事項</h2><p className="mt-1 text-xs text-(--text-muted)">只顯示目前有明確管理動作的項目。</p></div><ClipboardCheck aria-hidden="true" className="size-5 text-(--interactive-primary)" /></div><ul className="mt-3 divide-y divide-(--border-muted)">{items.map((item) => <li key={item.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><QueueIcon tone={item.tone} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-(--text-primary)">{item.label}</p><p className="mt-0.5 text-xs text-(--text-muted)">{item.value === 0 ? "目前沒有需要處理的項目" : `${item.value} 項需要查看`}</p></div><Link href={item.href} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">查看<ArrowRight aria-hidden="true" className="size-4" /></Link></li>)}</ul></section></Card>;
}

function QueueIcon({ tone }: { tone: QueueItem["tone"] }) {
  if (tone === "danger") return <ClockAlert aria-hidden="true" className="size-5 shrink-0 text-(--status-danger)" />;
  if (tone === "info") return <FileText aria-hidden="true" className="size-5 shrink-0 text-(--status-info)" />;
  return <ClipboardCheck aria-hidden="true" className="size-5 shrink-0 text-(--status-warning)" />;
}

export function AdminQuickLinks() {
  const links = [
    ["活動管理", "/admin/events", CalendarDays], ["會員管理", "/admin/memberships", Users], ["借用管理", "/admin/board-games/borrowings", ClipboardCheck], ["公告管理", "/admin/announcements", FileText],
  ] as const;
  return <section aria-labelledby="admin-quick-links-title"><h2 id="admin-quick-links-title" className="text-base font-semibold text-(--text-primary)">常用管理入口</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{links.map(([label, href, Icon]) => <Link key={href} href={href} className="flex min-h-20 flex-col justify-between rounded-xl border border-(--border-muted) bg-(--surface-default) p-3 text-sm font-medium text-(--text-primary) transition-colors hover:border-(--interactive-primary) hover:bg-(--surface-subtle) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"><Icon aria-hidden="true" className="size-5 text-(--interactive-primary)" />{label}</Link>)}</div></section>;
}

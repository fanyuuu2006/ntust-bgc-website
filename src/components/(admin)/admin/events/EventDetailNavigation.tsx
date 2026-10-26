import Link from "next/link";
import { cn } from "@/utils/className";

export function EventDetailNavigation({ eventId, active, returnTo }: { eventId: string; active: "overview" | "attendances"; returnTo: string }) {
  const items = [
    { key: "overview" as const, label: "總覽", href: `/admin/events/${eventId}?returnTo=${encodeURIComponent(returnTo)}` },
    { key: "attendances" as const, label: "簽到管理", href: `/admin/events/${eventId}/attendances?returnTo=${encodeURIComponent(returnTo)}` },
  ];
  return <nav aria-label="活動頁面導覽" className="flex min-w-0 max-w-full gap-1 overflow-x-auto border-b border-(--border-default)">
    {items.map((item) => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined} className={cn("min-h-10 shrink-0 px-3 py-2 text-sm font-medium text-(--text-secondary) focus-visible:outline-2 focus-visible:outline-(--focus-ring)", active === item.key ? "border-b-2 border-(--interactive-primary) text-(--interactive-primary)" : "hover:text-(--text-primary)")}>{item.label}</Link>)}
  </nav>;
}

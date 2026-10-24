"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/utils/className";
import { siteSettingsNavigation } from "./site-settings-navigation";

export function SiteSettingsNavigation() {
  const pathname = usePathname();
  const active = siteSettingsNavigation.find((item) => item.href === pathname) ?? siteSettingsNavigation[0];
  const ActiveIcon = active.icon;
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) return; const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } }; document.addEventListener("pointerdown", close); document.addEventListener("keydown", key); return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); }; }, [open]);
  if (pathname === "/admin/site-settings") return null;
  return <>
    <aside className="hidden min-w-0 lg:block"><nav aria-label="網站設定分類" className="sticky top-4"><ul className="space-y-1">{siteSettingsNavigation.map((item) => { const Icon = item.icon; const isActive = item.href === pathname; return <li key={item.id}><Link href={item.href} aria-current={isActive ? "page" : undefined} className={cn("flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)", isActive ? "bg-(--interactive-muted) text-(--interactive-primary)" : "text-(--text-secondary) hover:bg-(--surface-subtle) hover:text-(--text-primary)")}><Icon aria-hidden="true" className="size-4 shrink-0" /><span>{item.label}</span></Link></li>; })}</ul></nav></aside>
    <div ref={ref} className="relative lg:hidden"><button ref={triggerRef} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-(--border-default) bg-(--surface-default) px-3 text-sm font-medium text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"><span className="flex min-w-0 items-center gap-2"><ActiveIcon aria-hidden="true" className="size-4 shrink-0 text-(--interactive-primary)" /><span className="truncate">{active.label}</span></span><ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", open && "rotate-180")} /></button>{open ? <nav id={id} aria-label="網站設定分類" className="card absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 rounded-xl p-1.5 shadow-(--shadow-card)"><ul>{siteSettingsNavigation.map((item) => { const Icon = item.icon; const isActive = item.href === pathname; return <li key={item.id}><Link href={item.href} aria-current={isActive ? "page" : undefined} onClick={() => setOpen(false)} className={cn("flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm", isActive ? "bg-(--interactive-muted) text-(--interactive-primary)" : "text-(--text-secondary) hover:bg-(--surface-subtle)")}><Icon aria-hidden="true" className="size-4" />{item.label}</Link></li>; })}</ul></nav> : null}</div>
  </>;
}





import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { siteSettingsNavigation } from "./site-settings-navigation";

export function SiteSettingsCategoryList() {
  return <nav aria-label="網站設定分類"><ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">{siteSettingsNavigation.map((item) => { const Icon = item.icon; return <li key={item.href} className="min-w-0"><Link href={item.href} className="card interactive group flex min-h-28 min-w-0 items-start gap-3 rounded-2xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"><span className="shrink-0 rounded-xl bg-(--interactive-muted) p-2 text-(--interactive-primary)"><Icon aria-hidden="true" className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center justify-between gap-2 font-semibold text-(--text-primary)"><span className="truncate">{item.label}</span><ArrowRight aria-hidden="true" className="size-4 shrink-0 text-(--text-muted)" /></span><span className="mt-1 block break-words text-sm leading-5 text-(--text-muted)">{item.description}</span></span></Link></li>; })}</ul></nav>;
}

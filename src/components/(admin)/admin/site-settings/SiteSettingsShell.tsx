"use client";

import { usePathname } from "next/navigation";
import { SiteSettingsNavigation } from "./SiteSettingsNavigation";

export function SiteSettingsShell({ children }: { children: React.ReactNode }) {
  const isIndex = usePathname() === "/admin/site-settings";
  return (
    <div className={isIndex ? "min-w-0" : "grid min-w-0 gap-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start"}>
      <SiteSettingsNavigation />
      <main className="min-w-0">{children}</main>
    </div>
  );
}

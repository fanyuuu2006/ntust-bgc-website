import type { Metadata } from "next";

import { SiteSettingsShell } from "@/components/(admin)/admin/site-settings/SiteSettingsShell";
import { SiteSettingsProvider } from "@/components/(admin)/admin/site-settings/SiteSettingsProvider";

export const metadata: Metadata = { title: "網站設定", robots: { index: false, follow: false } };

export default function SiteSettingsLayout({ children }: { children: React.ReactNode }) {
  return <SiteSettingsProvider><section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8"><h1 className="sr-only">網站設定</h1><SiteSettingsShell>{children}</SiteSettingsShell></section></SiteSettingsProvider>;
}

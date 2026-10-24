"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import { SiteSettingsNavigation } from "./SiteSettingsNavigation";

export function SiteSettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === "/admin/site-settings";
  const categoryLabels: Record<string, string> = {
    branding: "\u54c1\u724c\u8a2d\u5b9a",
    homepage: "\u9996\u9801\u8a2d\u5b9a",
    contact: "\u806f\u7d61\u8cc7\u8a0a",
    seo: "SEO \u8a2d\u5b9a",
  };
  const category = pathname.split("/").filter(Boolean).at(-1);
  const breadcrumbItems: BreadcrumbItem[] = [
    { href: "/admin", label: "\u7ba1\u7406\u7e3d\u89bd" },
    { href: "/admin/site-settings", label: "\u7db2\u7ad9\u8a2d\u5b9a" },
    ...(category && categoryLabels[category]
      ? [{ label: categoryLabels[category] }]
      : []),
  ];
  return (
    <>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <div className={isIndex ? "min-w-0" : "grid min-w-0 gap-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start"}>
        <SiteSettingsNavigation />
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}

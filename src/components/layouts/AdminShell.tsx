"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "../(admin)/AdminHeader";
import { AdminSidebar } from "../(admin)/AdminSidebar";
import { adminSidebarNavigation } from "@/libs/navigation";
import type { User } from "@/types/database";
import { getActiveNavigationHref } from "@/utils/navigation";

type AdminShellProps = {
  user: User | null;
  children: React.ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const sidebarId = useId();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return null;

  const activeHref = getActiveNavigationHref(pathname, adminSidebarNavigation);
  const currentSection = adminSidebarNavigation.find(
    (item) => item.href === activeHref,
  );

  return (
    <>
      <AdminHeader
        className="sticky top-0 z-40"
        user={user}
        currentSectionLabel={currentSection?.label}
        isSidebarOpen={isSidebarOpen}
        sidebarId={sidebarId}
        onOpenMenu={() => setIsSidebarOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar
          id={sidebarId}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </>
  );
}

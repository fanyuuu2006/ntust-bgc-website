"use client";

import { useId, useRef, useState } from "react";
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  if (!user) return null;

  const activeHref = getActiveNavigationHref(pathname, adminSidebarNavigation);
  const currentSection = adminSidebarNavigation.find(
    (item) => item.href === activeHref,
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AdminHeader
        className="z-40 shrink-0"
        user={user}
        currentSectionLabel={currentSection?.label}
        isSidebarOpen={isSidebarOpen}
        sidebarId={sidebarId}
        menuButtonRef={menuButtonRef}
        onOpenMenu={() => setIsSidebarOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        <AdminSidebar
          id={sidebarId}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

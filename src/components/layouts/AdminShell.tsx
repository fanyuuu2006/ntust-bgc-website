"use client";

import { useCallback, useId, useRef, useState } from "react";
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
  const [sidebarState, setSidebarState] = useState({ pathname, isOpen: false });
  if (sidebarState.pathname !== pathname) {
    setSidebarState({ pathname, isOpen: false });
  }
  const isSidebarOpen =
    sidebarState.pathname === pathname && sidebarState.isOpen;

  const closeSidebar = useCallback((restoreFocus = true) => {
    setSidebarState({ pathname, isOpen: false });
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, [pathname]);

  if (!user) return null;

  const activeHref = getActiveNavigationHref(pathname, adminSidebarNavigation);
  const currentSection = adminSidebarNavigation.find(
    (item) => item.href === activeHref,
  );

  return (
    <div className="flex min-h-dvh shrink-0 flex-col">
      <AdminHeader
        className="sticky top-0 z-40 shrink-0"
        user={user}
        currentSectionLabel={currentSection?.label}
        isSidebarOpen={isSidebarOpen}
        sidebarId={sidebarId}
        menuButtonRef={menuButtonRef}
        onOpenMenu={() => setSidebarState({ pathname, isOpen: true })}
        inert={isSidebarOpen ? true : undefined}
      />
      <div className="flex flex-1">
        <AdminSidebar
          id={sidebarId}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />
        <main className="min-w-0 flex-1" inert={isSidebarOpen ? true : undefined}>
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AdminHeader } from "../(admin)/AdminHeader";
import { AdminSidebar } from "../(admin)/AdminSidebar";
import type { User } from "@/types/database";

type AdminShellProps = {
  user: User | null;
  children: React.ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <AdminHeader
        className="sticky top-0 z-40"
        user={user}
        onOpenMenu={() => setIsSidebarOpen(true)}
      />
      <div className="flex">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </>
  );
}

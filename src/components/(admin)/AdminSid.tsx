"use client";

import Link from "next/link";
import { cn } from "@/utils/className";
import { AdminSidebarNav } from "./AdminSideBarNav";

type AdminSidebarProps = React.HTMLAttributes<HTMLElement> & {
  isOpen: boolean;
  onClose: () => void;
};

function BackToSiteLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mt-auto border-t border-(--border) p-3">
      <Link
        href="/"
        onClick={onNavigate}
        className="block truncate rounded-lg px-3 py-2 text-sm text-(--muted) hover:bg-(--secondary-background) hover:text-(--foreground)"
      >
        ← 回網站
      </Link>
    </div>
  );
}

export function AdminSidebar({
  isOpen,
  onClose,
  className,
  ...rest
}: AdminSidebarProps) {
  return (
    <>
      {/* Desktop：固定側欄，lg 以上常駐顯示 */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-(--border) bg-(--primary-background) lg:block lg:w-60",
          className,
        )}
        {...rest}
      >
        <div className="sticky top-0 flex h-screen flex-col">
          <AdminSidebarNav />
          <BackToSiteLink />
        </div>
      </aside>

      {/* Mobile：Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="關閉管理選單"
            onClick={onClose}
            className="absolute inset-0 bg-(--foreground)/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="管理選單"
            className="relative flex h-full w-64 max-w-[80vw] flex-col bg-(--primary-background)"
          >
            <div className="flex items-center justify-between border-b border-(--border) p-3">
              <span className="text-sm font-bold text-(--foreground)">
                管理選單
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2.5 py-1 text-sm text-(--muted) hover:bg-(--secondary-background) hover:text-(--foreground)"
              >
                關閉
              </button>
            </div>
            <AdminSidebarNav onNavigate={onClose} />
            <BackToSiteLink onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
}

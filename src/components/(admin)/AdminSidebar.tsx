"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useModalDrawer } from "@/hooks/useModalDrawer";
import { siteConfigs } from "@/libs/siteConfigs";
import { cn } from "@/utils/className";
import { AdminSidebarNav } from "./AdminSidebarNav";

type AdminSidebarProps = React.HTMLAttributes<HTMLElement> & {
  id: string;
  isOpen: boolean;
  onClose: (restoreFocus?: boolean) => void;
};

function AdminSidebarHeader({ onClose, closeButtonRef }: {
  onClose: (restoreFocus?: boolean) => void;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-(--border-default) px-4 py-2">
      <Link href="/" onClick={() => onClose(false)} className="flex min-w-0 items-center gap-2.5" aria-label={`返回 ${siteConfigs.name} 首頁`}>
        <div className="size-10 shrink-0 overflow-hidden rounded-full">
          <Image src={siteConfigs.logo} alt={`${siteConfigs.fullName} Logo`} width={64} height={64} className="size-full object-contain" />
        </div>
        <p className="truncate text-sm font-bold">{siteConfigs.name}</p>
      </Link>

      <Button ref={closeButtonRef} type="button" onClick={() => onClose(true)} aria-label="關閉管理導覽" variant="ghost" size="sm" iconOnly className="shrink-0 rounded-lg lg:hidden">
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}

function AdminSidebarFooter({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mt-auto border-t border-(--border-default) p-3 sm:hidden">
      <Link href="/" onClick={onNavigate} className="block rounded-lg px-3 py-2 text-sm text-(--text-muted) transition-colors hover:bg-(--surface-subtle) hover:text-(--text-primary)">
        返回網站
      </Link>
    </div>
  );
}

export function AdminSidebar({ id, isOpen, onClose, className, ...rest }: AdminSidebarProps) {
  const { drawerRef, initialFocusRef } = useModalDrawer({ isOpen, onClose });

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) onClose(false);
    };
    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, [onClose]);

  return (
    <>
      {isOpen ? <div aria-hidden="true" onPointerDown={() => onClose(true)} className="fixed inset-0 z-40 bg-(--overlay-backdrop) lg:hidden" /> : null}

      <aside
        ref={drawerRef}
        id={id}
        aria-label="管理導覽"
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? "true" : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50",
          "flex h-dvh w-72 max-w-[calc(100vw-2rem)] flex-col",
          "border-r border-(--border-default) bg-(--surface-default)",
          "transition-transform duration-300",
          isOpen ? "visible translate-x-0" : "invisible -translate-x-full",
          "lg:sticky lg:inset-auto lg:top-14 lg:z-30 lg:h-[calc(100dvh-3.5rem)] lg:w-64 lg:max-w-none lg:shrink-0 lg:self-start",
          "lg:visible lg:translate-x-0 lg:transition-none",
          className,
        )}
        {...rest}
      >
        <AdminSidebarHeader onClose={onClose} closeButtonRef={initialFocusRef} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <AdminSidebarNav onNavigate={() => onClose(false)} />
        </div>
        <AdminSidebarFooter onNavigate={() => onClose(false)} />
      </aside>
    </>
  );
}

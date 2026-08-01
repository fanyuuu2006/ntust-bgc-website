"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/Header/UserMenu";
import { adminSidebarNavigation } from "@/libs/navigation";
import type { User } from "@/types/database";
import { cn } from "@/utils/className";
import { isAdminActivePath } from "@/utils/navigation";

type AdminHeaderProps = React.HTMLAttributes<HTMLElement> & {
  user: User;
  onOpenMenu: () => void;
};

const DEFAULT_SECTION_LABEL = "管理後臺";

export function AdminHeader({
  user,
  onOpenMenu,
  className,
  ...rest
}: AdminHeaderProps) {
  const pathname = usePathname();
  const currentSection = adminSidebarNavigation.find((item) =>
    isAdminActivePath(pathname, item.href),
  );

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between gap-3 border-b border-(--border) bg-(--primary-background) px-4 lg:px-6",
        className,
      )}
      {...rest}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="開啟管理選單"
          className="btn shrink-0 rounded-lg px-3 py-1.5 text-sm lg:hidden"
        >
          選單
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs text-(--muted)">管理後臺</p>
          <p className="truncate text-sm font-bold text-(--foreground) sm:text-base">
            {currentSection?.label ?? DEFAULT_SECTION_LABEL}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/"
          className="hidden rounded-lg px-3 py-1.5 text-sm text-(--muted) hover:bg-(--secondary-background) hover:text-(--foreground) sm:block"
        >
          回網站
        </Link>
        <UserMenu user={user} isAdmin />
      </div>
    </header>
  );
}
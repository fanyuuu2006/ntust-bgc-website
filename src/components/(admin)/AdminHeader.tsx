import Link from "next/link";
import { UserMenu } from "@/components/Header/UserMenu";
import type { User } from "@/types/database";
import { cn } from "@/utils/className";

const DEFAULT_SECTION_LABEL = "總覽";

type AdminHeaderProps = React.HTMLAttributes<HTMLElement> & {
  user: User;
  currentSectionLabel?: string;
  isSidebarOpen: boolean;
  sidebarId: string;
  onOpenMenu: () => void;
};

export function AdminHeader({
  user,
  currentSectionLabel,
  isSidebarOpen,
  sidebarId,
  onOpenMenu,
  className,
  ...rest
}: AdminHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col border-b border-(--border) bg-(--primary-background)",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between gap-4 py-2 px-4">
        {/* 左側：選單按鈕 + 目前頁面標題 */}
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-expanded={isSidebarOpen}
            aria-controls={sidebarId}
            className="shrink-0 btn rounded-xl size-10 flex items-center justify-center lg:hidden"
          >
            <span aria-hidden="true">☰</span>
            <span className="sr-only">開啟管理選單</span>
          </button>

          <h1 className="truncate text-lg font-bold text-(--foreground)">
            {currentSectionLabel ?? DEFAULT_SECTION_LABEL}
          </h1>
        </div>

        {/* 右側：回網站（僅 sm 以上顯示，手機版由 Sidebar Footer 提供） + 分隔線 + 使用者選單 */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className="btn outline hidden rounded-lg px-3 py-1.5 text-sm sm:inline-flex"
          >
            回網站
          </Link>

          <div
            aria-hidden="true"
            className="hidden h-6 w-px bg-(--border) sm:block"
          />

          <UserMenu user={user} isAdmin />
        </div>
      </div>
    </header>
  );
}

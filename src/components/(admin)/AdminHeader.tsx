import type { RefObject } from "react";
import { UserMenu } from "@/components/Header/UserMenu";
import type { User } from "@/types/database";
import { cn } from "@/utils/className";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Menu } from "lucide-react";

const DEFAULT_SECTION_LABEL = "總覽";

type AdminHeaderProps = React.HTMLAttributes<HTMLElement> & {
  user: User;
  currentSectionLabel?: string;
  isSidebarOpen: boolean;
  sidebarId: string;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
};

export function AdminHeader({
  user,
  currentSectionLabel,
  isSidebarOpen,
  sidebarId,
  menuButtonRef,
  onOpenMenu,
  className,
  ...rest
}: AdminHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col border-b border-(--border-default) bg-(--surface-default)",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between gap-4 py-2 px-4">
        {/* 左側：選單按鈕 + 目前頁面標題 */}
        <div className="flex min-w-0 items-center gap-4">
          <Button
            ref={menuButtonRef}
            type="button"
            onClick={onOpenMenu}
            aria-expanded={isSidebarOpen}
            aria-controls={sidebarId}
            variant="ghost"
            size="none"
            className="size-10 shrink-0 rounded-xl p-0 lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">開啟管理選單</span>
          </Button>

          <h1 className="truncate text-lg font-bold text-(--text-primary)">
            {currentSectionLabel ?? DEFAULT_SECTION_LABEL}
          </h1>
        </div>

        {/* 右側：回網站（僅 sm 以上顯示，手機版由 Sidebar Footer 提供） + 分隔線 + 使用者選單 */}
        <div className="flex shrink-0 items-center gap-3">
          <ButtonLink
            href="/"
            variant="outline"
            size="sm"
            className="hidden rounded-lg sm:inline-flex"
          >
            回網站
          </ButtonLink>

          <div
            aria-hidden="true"
            className="hidden h-6 w-px bg-(--border-default) sm:block"
          />

          <UserMenu user={user} isAdmin />
        </div>
      </div>
    </header>
  );
}

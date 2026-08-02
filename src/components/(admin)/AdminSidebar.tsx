import Image from "next/image";
import Link from "next/link";
import { siteConfigs } from "@/libs/siteConfigs";
import { cn } from "@/utils/className";
import { AdminSidebarNav } from "./AdminSidebarNav";

type AdminSidebarProps = React.HTMLAttributes<HTMLElement> & {
  id: string;
  isOpen: boolean;
  onClose: () => void;
};

function AdminSidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-(--border) px-4 py-3">
      <Link
        href="/admin"
        onClick={onClose}
        className="flex min-w-0 items-center gap-2.5"
        aria-label={`前往${siteConfigs.name}管理後臺首頁`}
      >
        <div className="size-8 shrink-0 overflow-hidden rounded-full">
          <Image
            src={siteConfigs.logo}
            alt={`${siteConfigs.fullName} Logo`}
            width={64}
            height={64}
            className="size-full object-contain"
          />
        </div>
        <p className="truncate text-sm font-bold text-(--foreground)">
          {siteConfigs.name}
        </p>
      </Link>

      <button
        type="button"
        onClick={onClose}
        aria-label="關閉管理選單"
        className="btn shrink-0 rounded-lg px-2.5 py-1 text-sm lg:hidden"
      >
        關閉
      </button>
    </div>
  );
}

function AdminSidebarFooter({ onNavigate }: { onNavigate: () => void }) {
  return (
    // sm 以上 Header 已提供「回網站」，這裡只服務手機 Drawer，避免同一功能出現兩次
    <div className="mt-auto border-t border-(--border) p-3 sm:hidden">
      <Link
        href="/"
        onClick={onNavigate}
        className="block truncate rounded-lg px-3 py-2 text-sm text-(--muted) transition-colors hover:bg-(--secondary-background) hover:text-(--foreground)"
      >
        回網站
      </Link>
    </div>
  );
}

export function AdminSidebar({
  id,
  isOpen,
  onClose,
  className,
  ...rest
}: AdminSidebarProps) {
  return (
    <>
      {/* Mobile 遮罩：僅開啟時渲染，避免常駐的隱形 overlay 影響互動 */}
      {isOpen && (
        <div
          role="button"
          aria-label="關閉管理選單"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-(--foreground)/40 lg:hidden"
        />
      )}

      {/* 單一側欄：手機以 fixed + translate 做 Drawer，lg 以上改為 sticky 常駐並讓出 header 高度 */}
      <aside
        id={id}
        aria-label="管理選單"
        className={cn(
          "fixed inset-y-0 left-0 z-50",
          "flex h-screen w-72 flex-col",
          "border-r border-(--border) bg-(--primary-background)",
          "transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:z-30 lg:w-64",
          "lg:translate-x-0",
          className,
        )}
        {...rest}
      >
        <AdminSidebarHeader onClose={onClose} />

        <div className="flex-1 overflow-y-auto">
          <AdminSidebarNav onNavigate={onClose} />
        </div>

        <AdminSidebarFooter onNavigate={onClose} />
      </aside>
    </>
  );
}

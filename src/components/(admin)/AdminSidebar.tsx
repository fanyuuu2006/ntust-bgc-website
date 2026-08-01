import Image from "next/image";
import Link from "next/link";
import { siteConfigs } from "@/libs/siteConfigs";
import { cn } from "@/utils/className";
import { AdminSidebarNav } from "./AdminSidebarNav";

type AdminSidebarProps = React.HTMLAttributes<HTMLElement> & {
  isOpen: boolean;
  onClose: () => void;
};

function SidebarHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-(--border) px-4 py-4">
      <Link
        href="/admin"
        onClick={onClose}
        className="flex min-w-0 items-center gap-2.5"
        aria-label={`前往${siteConfigs.name}管理後臺首頁`}
      >
        <div className="size-9 shrink-0 overflow-hidden rounded-full">
          <Image
            src={siteConfigs.logo}
            alt={`${siteConfigs.fullName} Logo`}
            width={72}
            height={72}
            className="size-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-(--foreground)">
            {siteConfigs.name}
          </p>
          <p className="truncate text-xs text-(--muted)">管理後臺</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={onClose}
        className="btn shrink-0 rounded-lg px-2.5 py-1 text-sm lg:hidden"
      >
        關閉
      </button>
    </div>
  );
}

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
      {/* Mobile 遮罩：僅開啟時渲染 */}
      {isOpen && (
        <button
          type="button"
          aria-label="關閉管理選單"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-(--foreground)/40 lg:hidden"
        />
      )}

      {/* 單一側欄：手機以 fixed + translate 做 Drawer，lg 以上改為 sticky 常駐並讓出 header 高度 */}
      <aside
        aria-label="管理選單"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col",
          "border-r border-(--border) bg-(--primary-background) shadow-(--shadow-hover)",
          "transition-transform duration-(--transition-normal) ease-(--transition-timing)",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-14 lg:z-30 lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:translate-x-0 lg:shadow-none",
          className,
        )}
        {...rest}
      >
        <SidebarHeader onClose={onClose} />
        <AdminSidebarNav onNavigate={onClose} />
        <BackToSiteLink onNavigate={onClose} />
      </aside>
    </>
  );
}
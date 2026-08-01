"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSidebarNavigation } from "@/libs/navigation";
import { cn } from "@/utils/className";
import { isAdminActivePath } from "@/utils/navigation";

type AdminSidebarNavProps = React.HTMLAttributes<HTMLElement> & {
  onNavigate?: () => void;
};

export function AdminSidebarNav({
  onNavigate,
  className,
  ...rest
}: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="管理功能"
      className={cn("flex flex-col gap-0.5 p-3", className)}
      {...rest}
    >
      {adminSidebarNavigation.map((item) => {
        const active = isAdminActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "truncate rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-(--secondary-background) font-semibold text-(--primary)"
                : "text-(--foreground)/70 hover:bg-(--secondary-background) hover:text-(--foreground)",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

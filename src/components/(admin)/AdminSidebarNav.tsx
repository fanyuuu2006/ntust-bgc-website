"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSidebarGroups, adminSidebarNavigation } from "@/libs/navigation";
import { cn } from "@/utils/className";
import { isAdminActivePath } from "@/utils/navigation";

type Props = React.HTMLAttributes<HTMLElement> & { onNavigate?: () => void };

export function AdminSidebarNav({ onNavigate, className, ...rest }: Props) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="管理後台導覽"
      className={cn("space-y-5 p-3", className)}
      {...rest}
    >
      {adminSidebarGroups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-(--muted)">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isAdminActivePath(
                pathname,
                item.href,
                adminSidebarNavigation,
              );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm leading-5 transition-colors",
                    active
                      ? "bg-(--secondary-background) font-semibold text-(--primary)"
                      : "text-(--foreground)/70 hover:bg-(--secondary-background) hover:text-(--foreground)",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";

import { settingsNavigation } from "./settings-navigation-data";
import { cn } from "@/utils/className";

export function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden lg:block">
        <nav aria-label="設定分類" className="card rounded-2xl p-2">
          <ul className="space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                      isActive
                        ? "bg-(--interactive-muted) text-(--interactive-primary)"
                        : "text-(--text-secondary) hover:bg-(--surface-subtle) hover:text-(--text-primary)",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      {pathname !== "/settings" ? (
        <Link
          href="/settings"
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg px-1 text-sm font-medium text-(--interactive-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) lg:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          返回設定
        </Link>
      ) : null}
    </>
  );
}

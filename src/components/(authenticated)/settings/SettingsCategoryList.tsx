import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { settingsNavigation } from "./settings-navigation-data";

export function SettingsCategoryList() {
  return (
    <nav aria-label="設定分類">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {settingsNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="card interactive group flex h-full min-h-24 items-start gap-3 rounded-2xl p-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) sm:p-4"
              >
                <span className="rounded-xl bg-(--interactive-muted) p-2 text-(--interactive-primary)">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-semibold text-(--text-primary)">
                    {item.label}
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-(--text-muted) transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-(--text-muted)">
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

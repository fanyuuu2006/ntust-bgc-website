"use client";

import {
  isNavigationItemActive,
  type NavigationItem,
} from "@/libs/navigation";
import { cn } from "@/utils/className";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DesktopNavigationProps = React.HTMLAttributes<HTMLElement> & {
  items: readonly NavigationItem[];
};

export const DesktopNavigation = ({
  className,
  items,
  ...rest
}: DesktopNavigationProps) => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主導覽"
      className={cn("hidden items-center gap-1 md:flex", className)}
      {...rest}
    >
      {items.map((item) => {
        const isActive = isNavigationItemActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              // 基礎樣式
              "relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-(--foreground)/70",
              "transition-colors duration-200",
              // hover
              "hover:text-(--primary)",
              // 底線指示條(不只靠顏色表達狀態)
              "after:absolute after:inset-x-3.5 after:-bottom-px after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-(--primary) after:transition-transform after:duration-300 after:content-['']",
              "hover:after:scale-x-100",
              {
                // 當前頁面樣式
                "text-(--primary) after:scale-x-100": isActive,
              },
            )}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

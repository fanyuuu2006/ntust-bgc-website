"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  isNavigationItemActive,
  type NavigationItem,
} from "@/libs/navigation";
import { cn } from "@/utils/className";

type MobileNavigationProps = React.HTMLAttributes<HTMLDivElement> & {
  items: readonly NavigationItem[];
};

export function MobileNavigation({
  items,
  className,
  ...props
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const closeNavigation = () => setIsOpen(false);

  return (
    <div ref={containerRef} className={cn("relative md:hidden", className)} {...props}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        iconOnly
        aria-label={isOpen ? "關閉導覽選單" : "開啟導覽選單"}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="size-11 rounded-xl"
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
      </Button>

      {isOpen ? (
        <div
          id={panelId}
          className="card absolute left-0 top-[calc(100%+0.5rem)] z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl p-2 shadow-(--shadow-card)"
        >
          <nav aria-label="主要導覽" className="grid gap-1">
            {items.map((item) => {
              const isActive = isNavigationItemActive(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={closeNavigation}
                  className={cn(
                    "flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-(--surface-subtle) text-(--action)"
                      : "text-(--text-primary) hover:bg-(--surface-subtle)",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

        </div>
      ) : null}
    </div>
  );
}

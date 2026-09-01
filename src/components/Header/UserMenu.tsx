"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { adminNavigation, memberMenuNavigation, type NavigationItem } from "@/libs/navigation";
import type { User } from "@/types/database";
import { cn } from "@/utils/className";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "../LogoutButton";
import { UserAvatar } from "../UserAvatar";

type MenuLinksProps = {
  items: readonly NavigationItem[];
  onNavigate: () => void;
};

function MenuLinks({ items, onNavigate }: MenuLinksProps) {
  return (
    <div className="grid gap-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="flex min-h-10 items-center rounded-lg px-3 text-sm text-(--text-primary) transition-colors hover:bg-(--surface-subtle)"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

type UserMenuProps = React.HTMLAttributes<HTMLDivElement> & {
  user: User;
  isAdmin: boolean;
};

export function UserMenu({
  user,
  isAdmin,
  className,
  ...props
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      triggerRef.current?.focus();
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

  const closeMenu = () => setIsOpen(false);

  return (
    <div ref={containerRef} className={cn("relative", className)} {...props}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="none"
        iconOnly
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`帳號選單，${user.name}`}
        onClick={() => setIsOpen((open) => !open)}
        className="size-11 rounded-full p-0.5"
      >
        <UserAvatar
          user={user}
          className="size-9 rounded-full border border-(--border-default)"
        />
      </Button>

      {isOpen ? (
        <div
          id={panelId}
          aria-label="帳號選單"
          className="card absolute right-0 top-[calc(100%+0.5rem)] z-50 flex max-h-[min(70dvh,32rem)] w-72 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl p-1.5 shadow-(--shadow-card)"
        >
          <Link
            href="/profile"
            onClick={closeMenu}
            className="flex min-h-12 items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-(--surface-subtle)"
          >
            <UserAvatar user={user} className="size-8 shrink-0 rounded-full" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-(--text-primary)">
                {user.name}
              </span>
              <span className="block truncate text-xs text-(--text-muted)">
                {user.email}
              </span>
            </span>
          </Link>

          <hr className="my-0.5 border-(--border-muted)" />
          <MenuLinks items={memberMenuNavigation} onNavigate={closeMenu} />

          {isAdmin ? (
            <>
              <hr className="my-0.5 border-(--border-muted)" />
              <MenuLinks items={adminNavigation} onNavigate={closeMenu} />
            </>
          ) : null}

          <hr className="my-0.5 border-(--border-muted)" />
          <LogoutButton
            variant="ghost"
            className="w-full justify-start px-3 text-(--status-danger) hover:text-(--status-danger)"
            onClick={closeMenu}
          >
            登出
          </LogoutButton>
        </div>
      ) : null}
    </div>
  );
}

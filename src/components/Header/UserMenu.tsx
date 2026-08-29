"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { adminNavigation, userNavigation } from "@/libs/navigation";
import type { User } from "@/types/database";
import { cn } from "@/utils/className";
import { LogoutButton } from "../LogoutButton";
import { UserAvatar } from "../UserAvatar";

type NavLinkItem = {
  label: string;
  href: string;
};

type MenuItemProps = NavLinkItem & {
  onNavigate: () => void;
};

function MenuItem({ label, href, onNavigate }: MenuItemProps) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="truncate rounded-lg px-3 py-2 text-sm text-(--foreground)/70 hover:bg-(--secondary-background) hover:text-(--foreground)"
    >
      {label}
    </Link>
  );
}

type MenuGroupProps = {
  label: string;
  items: Readonly<NavLinkItem[]>;
  onNavigate: () => void;
};

function MenuGroup({ label, items, onNavigate }: MenuGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold tracking-wide text-(--muted) uppercase">
        {label}
      </p>
      {items.map((item) => (
        <MenuItem key={item.href} {...item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

type UserMenuProps = React.HTMLAttributes<HTMLDivElement> & {
  user: User;
  isAdmin: boolean;
};

export const UserMenu = ({
  user,
  isAdmin,
  className,
  ...rest
}: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Esc 關閉並將焦點還給觸發按鈕 + 點擊外部關閉
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-center justify-center", className)}
      {...rest}
    >
      <button
        id={buttonId}
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`使用者選單，${user.name}`}
        className="rounded-full p-0.5"
      >
        <UserAvatar
          user={user}
          className="size-9 rounded-full border border-(--border)"
        />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="menu"
          aria-labelledby={buttonId}
          className={cn(
            "card absolute top-[calc(100%+0.5rem)] right-0 z-50",
            "flex max-h-[70vh] w-64 max-w-[calc(100vw-2rem)] flex-col gap-1",
            "overflow-y-auto rounded-xl p-1.5",
          )}
        >
          <Link
            href="/profile"
            onClick={closeMenu}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-(--secondary-background)"
          >
            <UserAvatar user={user} className="size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium text-(--foreground)">
                {user.name}
              </span>
              <span className="truncate text-xs text-(--muted)">
                {user.email}
              </span>
            </div>
          </Link>

          <hr role="separator" className="my-0.5 border-(--border)" />

          <MenuGroup
            label="使用者"
            items={userNavigation}
            onNavigate={closeMenu}
          />

          {isAdmin && (
            <>
              <hr role="separator" className="my-0.5 border-(--border)" />
              <MenuGroup
                label="幹部"
                items={adminNavigation}
                onNavigate={closeMenu}
              />
            </>
          )}

          <hr role="separator" className="my-0.5 border-(--border)" />

          <LogoutButton
            className="btn danger w-full rounded-lg py-2 text-sm"
            onClick={closeMenu}
          >
            登出
          </LogoutButton>
        </div>
      )}
    </div>
  );
};

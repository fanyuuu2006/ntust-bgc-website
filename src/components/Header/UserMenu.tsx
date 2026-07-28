"use client";
import { User } from "@/types/database";
import { UserAvatar } from "../UserAvatar";
import { LogoutButton } from "../LogoutButton";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/utils/className";
import Link from "next/link";

type MenuItemProps = {
  label: string;
  href: string;
};

const MenuItem = ({ label, href }: MenuItemProps) => {
  return (
    <Link
      href={href}
      className="text-sm flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-(--secondary-background) text-(--foreground)/70 truncate"
    >
      <span className="truncate">{label}</span>
    </Link>
  );
};

const MENU_ITEMS = [
  {
    label: "儀表板",
    href: "/dashboard",
  },
  {
    label: "個人資料",
    href: "/profile",
  },
  {
    label: "設定",
    href: "/settings",
  },
];

type UserMenuProps = React.HTMLAttributes<HTMLDivElement> & {
  user: User;
};

export const UserMenu = ({ user, className, ...rest }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Esc 關閉 + 點擊外部關閉
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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
      className={cn("relative flex items-center justify-center", className)}
      ref={containerRef}
      {...rest}
    >
      <button
        id={buttonId}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`使用者選單，${user.name}`}
        className="rounded-full p-0.5"
      >
        <UserAvatar
          className="size-9 rounded-full border border-(--border)"
          user={user}
        />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="menu"
          aria-labelledby={buttonId}
          className={cn(
            "card rounded-xl absolute right-0 top-[calc(100%+0.5rem)] z-50",
            "w-60 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto",
            "p-1.5 flex flex-col gap-1",
          )}
        >
          {/* 使用者資訊 */}
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <UserAvatar className="size-8 rounded-full shrink-0" user={user} />
            <div className="min-w-0 flex flex-col leading-tight">
              <span className="truncate font-medium text-(--foreground)">
                {user.name}
              </span>
              <span className="truncate text-xs text-(--muted)">
                {user.email}
              </span>
            </div>
          </div>

          <hr className="border-(--border) my-0.5" />

          <div className="flex flex-col gap-0.5">
            {MENU_ITEMS.map((item) => (
              <MenuItem key={item.href} {...item} />
            ))}
          </div>

          <hr className="border-(--border) my-0.5" />

          <LogoutButton
            className="btn danger py-2 w-full rounded-lg text-sm"
            onClick={closeMenu}
          >
            登出
          </LogoutButton>
        </div>
      )}
    </div>
  );
};

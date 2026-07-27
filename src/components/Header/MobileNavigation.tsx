"use client";
import { mainNavigation } from "@/libs/navigation";
import { cn } from "@/utils/className";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type MobileNavigationProps = React.HTMLAttributes<HTMLDivElement>;

export const MobileNavigation = ({
  className,
  ...rest
}: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
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

  return (
    <div
      ref={containerRef}
      className={cn("relative md:hidden", className)}
      {...rest}
    >
      <button
        type="button"
        aria-label={isOpen ? "關閉主選單" : "開啟主選單"}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "btn rounded-xl size-10 flex items-center justify-center",
        )}
      >
        {isOpen ? (
          <CloseOutlined aria-hidden="true" />
        ) : (
          <MenuOutlined aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <nav
          id={panelId}
          aria-label="行動裝置主導覽"
          className={cn("absolute right-0 top-[calc(100%+0.5rem)] z-50")}
        >
          <div
            className={cn(
              "min-w-48 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto",
              "card rounded-xl p-1 flex flex-col gap-1",
            )}
          >
            {mainNavigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    // 基礎樣式
                    "relative flex items-center rounded-lg px-4 py-2",
                    "text-sm font-medium text-(--foreground)/70",
                    "transition-all duration-300",
                    // hover(與 desktop 一致)
                    "hover:bg-(--secondary-background) hover:text-(--primary)",
                    // 鍵盤可及性
                    "outline-none focus-visible:ring-2 focus-visible:ring-(--primary) focus-visible:ring-offset-2",
                    {
                      // 當前頁面樣式
                      "text-(--primary) bg-(--secondary-background) font-semibold before:scale-y-100":
                        isActive,
                    },
                  )}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

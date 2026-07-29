"use client";
import { cn } from "@/utils/className";
import Link from "next/link";
import {
  UserOutlined,
  InboxOutlined,
  CalendarOutlined,
  RightOutlined,
} from "@ant-design/icons";
import type { ComponentType, CSSProperties } from "react";

type DashboardMenuItem = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType;
  /** 對應 globals.css 中既有的桌遊積木色 token 名稱 */
  color: "blue" | "green" | "yellow" | "red";
};

/**
 * 目前對所有已登入使用者顯示相同入口。
 * 未來若需依社員/幹部身份顯示不同項目，
 * 應改為從 server 端依權限 filter 後傳入，
 * 而非在此檔案內寫死判斷邏輯。
 */
const dashboardMenuItems: DashboardMenuItem[] = [
  {
    title: "個人資料",
    description: "查看您的社員資訊、身分與個人資料",
    href: "/profile",
    icon: UserOutlined,
    color: "blue",
  },
  {
    title: "借用紀錄",
    description: "查看桌遊借用狀態、歷史紀錄與歸還資訊",
    href: "/borrowings",
    icon: InboxOutlined,
    color: "green",
  },
  {
    title: "活動紀錄",
    description: "查看社課、活動出席與簽到紀錄",
    href: "/attendance",
    icon: CalendarOutlined,
    color: "yellow",
  },
];

type DashboardMenuProps = React.HTMLAttributes<HTMLDivElement>;

export function DashboardMenu({ className, ...rest }: DashboardMenuProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      {...rest}
    >
      {dashboardMenuItems.map(
        ({ title, description, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={"card rounded-xl group flex items-start gap-4 p-6"}
            style={{ "--menu-color": `var(--game-${color})` } as CSSProperties}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-(--border-radius-md) bg-(--menu-color)/10 text-lg text-(--menu-color) transition-colors duration-(--transition-normal) group-hover:bg-(--menu-color) group-hover:text-(--primary-background)">
              <Icon aria-hidden />
            </span>

            <div className="flex flex-1 flex-col gap-1">
              <h3 className="text-base font-semibold text-(--foreground)">
                {title}
              </h3>
              <p className="text-sm text-(--muted)">{description}</p>
            </div>

            <RightOutlined
              aria-hidden
              className="mt-1 shrink-0 text-sm text-(--muted) transition-transform duration-(--transition-normal) group-hover:translate-x-1 group-hover:text-(--foreground)"
            />
          </Link>
        ),
      )}
    </div>
  );
}

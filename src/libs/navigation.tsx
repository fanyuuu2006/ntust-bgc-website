export type NavigationItem = {
  label: string;
  href: string;
  activePaths?: readonly string[];
};

export const publicNavigation = [
  { label: "首頁", href: "/" },
  { label: "公告", href: "/announcements" },
  { label: "桌遊", href: "/board-games" },
] as const satisfies readonly NavigationItem[];

export const memberMenuNavigation = [
  { label: "儀表板", href: "/dashboard" },
  { label: "社員資格", href: "/memberships" },
  { label: "借用紀錄", href: "/borrowings" },
  { label: "設定", href: "/settings" },
] as const satisfies readonly NavigationItem[];

export const adminNavigation = [{ label: "管理後台", href: "/admin" }] as const;

export function isNavigationItemActive(pathname: string, item: NavigationItem) {
  const paths = [item.href, ...(item.activePaths ?? [])];

  return paths.some((path) =>
    path === "/"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

type AdminNavigationItem = { label: string; href: string };
type AdminNavigationGroup = {
  label: string;
  items: readonly AdminNavigationItem[];
};

export const adminSidebarGroups: readonly AdminNavigationGroup[] = [
  { label: "總覽", items: [{ label: "儀表板", href: "/admin" }] },
  {
    label: "桌遊",
    items: [
      { label: "桌遊管理", href: "/admin/board-games" },
      { label: "桌遊借用管理", href: "/admin/board-games/borrowings" },
      { label: "桌遊種類管理", href: "/admin/board-games/categories" },
      { label: "桌遊位置管理", href: "/admin/board-games/locations" },
    ],
  },
  {
    label: "社員",
    items: [
      { label: "使用者管理", href: "/admin/users" },
      { label: "社員資格管理", href: "/admin/memberships" },
      { label: "社員註冊序號管理", href: "/admin/memberships/register-keys" },
      { label: "幹部管理", href: "/admin/officers" },
    ],
  },
  {
    label: "社團內容",
    items: [
      { label: "活動管理", href: "/admin/events" },
      { label: "公告管理", href: "/admin/announcements" },
      { label: "學年度管理", href: "/admin/academic-years" },
    ],
  },
] as const;

export const adminSidebarNavigation = adminSidebarGroups.flatMap(
  (group) => group.items,
);

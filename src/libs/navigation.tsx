export const mainNavigation = [
  { label: "首頁", href: "/" },
  { label: "公告", href: "/announcements" },
  { label: "桌遊", href: "/board-games" },
] as const;

export const userNavigation = [
  { label: "儀表板", href: "/dashboard" },
  { label: "我的借用", href: "/borrowings" },
  { label: "社員資格", href: "/memberships" },
  { label: "個人資料", href: "/profile" },
  { label: "設定", href: "/settings" },
] as const;

export const adminNavigation = [{ label: "管理後台", href: "/admin" }] as const;

type AdminNavigationItem = { label: string; href: string };
type AdminNavigationGroup = { label: string; items: readonly AdminNavigationItem[] };

export const adminSidebarGroups: readonly AdminNavigationGroup[] = [
  { label: "總覽", items: [{ label: "儀表板", href: "/admin" }] },
  {
    label: "社產",
    items: [
      { label: "桌遊管理", href: "/admin/board-games" },
      { label: "桌遊種類", href: "/admin/board-games/categories" },
      { label: "桌遊位置", href: "/admin/board-games/locations" },
      { label: "借用管理", href: "/admin/board-games/borrowings" },
    ],
  },
  {
    label: "人員管理",
    items: [
      { label: "使用者管理", href: "/admin/users" },
      { label: "社員資格", href: "/admin/memberships" },
      { label: "社員註冊碼", href: "/admin/memberships/register-keys" },
      { label: "幹部管理", href: "/admin/officers" },
    ],
  },
  {
    label: "社團管理",
    items: [
      { label: "活動管理", href: "/admin/events" },
      { label: "公告管理", href: "/admin/announcements" },
      { label: "學年度", href: "/admin/academic-years" },
    ],
  },
] as const;

export const adminSidebarNavigation = adminSidebarGroups.flatMap(
  (group) => group.items,
);

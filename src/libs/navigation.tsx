export const mainNavigation = [
  {
    label: "首頁",
    href: "/",
  },
  {
    label: "公告",
    href: "/announcements",
  },
  {
    label: "桌遊",
    href: "/board-games",
  },
] as const;

export const userNavigation = [
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
] as const;

export const adminNavigation = [
  {
    label: "管理後臺",
    href: "/admin",
  },
] as const;

export const adminSidebarNavigation = [
  {
    label: "管理後臺",
    href: "/admin",
  },
  {
    label: "桌遊",
    href: "/admin/board-games",
  },
  {
    label: "公告",
    href: "/admin/announcements",
  },
  {
    label: "活動",
    href: "/admin/events",
  },
  {
    label: "社員",
    href: "/admin/members",
  },
  {
    label: "幹部",
    href: "/admin/officers",
  },
];

import Link from "next/link";

type DashboardMenuItem = {
  title: string;
  description: string;
  href: string;
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
    description: "查看與修改您的基本資料",
    href: "/dashboard/profile",
  },
  {
    title: "借用紀錄",
    description: "查看目前借用中的桌遊與歷史紀錄",
    href: "/dashboard/borrowings",
  },
  {
    title: "簽到紀錄",
    description: "查看您參與過的社課與活動",
    href: "/dashboard/attendance",
  },
];

export function DashboardMenu() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dashboardMenuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="card accent flex flex-col gap-2 p-6"
        >
          <h3 className="text-base font-semibold text-(--foreground)">
            {item.title}
          </h3>
          <p className="text-sm text-(--muted)">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}

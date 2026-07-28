import { redirect } from "next/navigation";
import { getCurrentUser } from "@/libs/auth";
import { DashboardCard } from "@/components/(authenticated)/dashboard/DashboardCard";
import { DashboardMenu } from "@/components/(authenticated)/dashboard/DashboardMenu";
import { DashboardWelcome } from "@/components/(authenticated)/dashboard/DashboardWelcome";

export const metadata = {
  title: "會員中心",
  description: "查看您的帳號資訊與功能入口",
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // (authenticated)/layout.tsx 已經檢查過登入狀態，這裡是額外防呆，
  // 同時讓 TypeScript 能正確窄化 user 型別（避免使用 `!` 斷言）
  if (!user) {
    redirect("/login");
  }

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8">
        <DashboardWelcome user={user} />

        <DashboardCard title="帳號資訊">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
              <dt className="w-20 shrink-0 text-(--muted)">姓名</dt>
              <dd className="text-(--foreground)">{user.name}</dd>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
              <dt className="w-20 shrink-0 text-(--muted)">Email</dt>
              <dd className="text-(--foreground)">{user.email}</dd>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
              <dt className="w-20 shrink-0 text-(--muted)">註冊時間</dt>
              <dd className="text-(--foreground)">
                {formatDate(user.created_at)}
              </dd>
            </div>
          </dl>
        </DashboardCard>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-(--foreground)">
            功能入口
          </h2>
          <DashboardMenu />
        </div>
      </div>
    </section>
  );
}

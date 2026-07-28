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

  if (!user) {
    return null;
  }

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8">
        <DashboardWelcome user={user} />

        <DashboardCard title="帳號資訊">
          <dl className="flex flex-col gap-3 text-sm">
            {[
              {
                label: "姓名",
                value: user.name,
              },
              {
                label: "Email",
                value: user.email,
              },
              {
                label: "註冊時間",
                value: formatDate(user.created_at),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-1 sm:flex-row sm:gap-2"
              >
                <dt className="w-20 shrink-0 text-(--muted)">{item.label}</dt>
                <dd className="text-(--foreground)">{item.value}</dd>
              </div>
            ))}
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

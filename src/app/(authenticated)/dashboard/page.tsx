import { getCurrentUser } from "@/libs/auth";
import { DashboardMenu } from "@/components/(authenticated)/dashboard/DashboardMenu";
import { DashboardWelcome } from "@/components/(authenticated)/dashboard/DashboardWelcome";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8">
        <DashboardWelcome user={user} />

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

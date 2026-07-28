import { UserAvatar } from "@/components/UserAvatar";
import { getCurrentUser } from "@/libs/auth";

export default async function DashboardProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return (
    <div className="container flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold text-(--foreground)">個人資料</h1>
      <p className="text-(--foreground-muted)">
        您可以在此查看與修改您的個人資料
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar className="size-16" user={user} />
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-(--foreground-muted)">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

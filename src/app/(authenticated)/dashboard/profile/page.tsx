import { ProfileForm } from "@/components/(authenticated)/dashboard/profile/ProfileForm";
import { getCurrentUser } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return null
  }

  const profile = await usersService.getProfile(user.id);

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-(--foreground)">個人資料</h1>
          <p className="text-sm text-(--muted)">查看與修改您的帳號資料</p>
        </div>

        <ProfileForm user={user} profile={profile} />
      </div>
    </section>
  );
}

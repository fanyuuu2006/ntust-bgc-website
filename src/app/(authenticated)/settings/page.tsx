import { AccountSettingsCard } from "@/components/(authenticated)/settings/AccountSettingsCard";
import { PasswordSettingsCard } from "@/components/(authenticated)/settings/PasswordSettingsCard";
import { ProfileSettingsCard } from "@/components/(authenticated)/settings/ProfileSettingsCard";
import { SessionSettingsCard } from "@/components/(authenticated)/settings/SessionSettingsCard";
import { getCurrentUser } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const profile = await usersService.getProfile(user.id);

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-(--foreground)">設定</h1>
          <p className="text-sm text-(--muted)">
            管理您的帳號、個人資料與安全性設定
          </p>
        </div>

        <AccountSettingsCard user={user} />
        <ProfileSettingsCard profile={profile} />
        <PasswordSettingsCard />
        <SessionSettingsCard userId={user.id} />
      </div>
    </section>
  );
}

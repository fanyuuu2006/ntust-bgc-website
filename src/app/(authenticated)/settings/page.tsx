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
    <main className="pb-8 sm:pb-12">
      <div className="container py-6 sm:py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
          <div>
            <h1 className="text-2xl font-bold text-(--foreground)">設定</h1>
          </div>

          <div className="flex flex-col gap-5 sm:gap-6">
            <AccountSettingsCard
              key={user.updated_at}
              id="account"
              user={user}
            />
            <ProfileSettingsCard
              key={profile?.updated_at ?? "new-profile"}
              id="profile"
              profile={profile}
            />
          </div>
          <div className="flex flex-col gap-5 sm:gap-6">
            <PasswordSettingsCard id="password" />
            <SessionSettingsCard id="sessions" userId={user.id} />
          </div>
        </div>
      </div>
    </main>
  );
}

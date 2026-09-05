import { AlertCircle, ShieldCheck, UserRoundCog } from "lucide-react";

import { AccountSettingsForm } from "@/components/(authenticated)/settings/AccountSettingsForm";
import { PasswordSettingsForm } from "@/components/(authenticated)/settings/PasswordSettingsForm";
import { ProfileSettingsForm } from "@/components/(authenticated)/settings/ProfileSettingsForm";
import { SessionSettingsSection } from "@/components/(authenticated)/settings/SessionSettingsSection";
import { SettingsCard } from "@/components/(authenticated)/settings/SettingsCard";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await usersService.getProfile(user.id);

  return (
    <section className="container max-w-5xl space-y-5 py-6 sm:space-y-6 sm:py-8">
      <PageHeader
        title="設定"
        description="管理帳號、個人資料與登入安全。"
      />

      <SettingsCard
        id="account-and-profile"
        title="帳號與個人資料"
        description="更新網站身份、聯絡方式與學籍資料。"
        icon={<UserRoundCog aria-hidden="true" className="size-5" />}
      >
        <AccountSettingsForm key={user.updated_at} user={user} />

        <div className="mt-5 border-t border-(--border-default) pt-5 sm:mt-6 sm:pt-6">
          {profile ? (
            <ProfileSettingsForm key={profile.updated_at} profile={profile} />
          ) : (
            <section aria-labelledby="profile-settings-unavailable-title">
              <div className="flex items-start gap-3 rounded-xl border border-(--border-muted) bg-(--surface-subtle) p-3 sm:p-4">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-(--status-warning)"
                />
                <div className="min-w-0">
                  <h3
                    id="profile-settings-unavailable-title"
                    className="font-semibold text-(--text-primary)"
                  >
                    個人資料暫時無法載入
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-(--text-muted)">
                    帳號與安全性設定仍可使用；若重新整理後仍無法載入，請聯絡社團幹部。
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        id="security"
        title="安全性"
        description="變更密碼並管理目前有效的登入工作階段。"
        icon={<ShieldCheck aria-hidden="true" className="size-5" />}
      >
        <PasswordSettingsForm />
        <div className="mt-5 border-t border-(--border-default) pt-5 sm:mt-6 sm:pt-6">
          <SessionSettingsSection userId={user.id} />
        </div>
      </SettingsCard>
    </section>
  );
}

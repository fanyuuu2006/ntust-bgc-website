import type { Metadata } from "next";
import { AlertCircle, CircleUserRound } from "lucide-react";
import { AccountSettingsForm } from "@/components/(authenticated)/settings/AccountSettingsForm";
import { ProfileSettingsForm } from "@/components/(authenticated)/settings/ProfileSettingsForm";
import { PublicProfileSettings } from "@/components/(authenticated)/settings/PublicProfileSettings";
import { SettingsCard } from "@/components/(authenticated)/settings/SettingsCard";
import { getCurrentUser } from "@/libs/auth";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { usersService } from "@/services/users/users.service";

export const metadata: Metadata = { title: "個人資料｜設定", description: "管理頭像、顯示名稱、聯絡方式與學籍資料。" };

async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await usersService.getProfile(user.id);
  return (
    <SettingsCard title="個人資料" icon={<CircleUserRound aria-hidden="true" className="size-5" />}>
      <AccountSettingsForm key={user.updated_at} user={user} />
      <PublicProfileSettings
        initialVisibility={user.profile_visibility}
        initialOptedIn={Boolean(user.review_contributor_ranking_opt_in)}
      />
      <div className="mt-5 border-t border-(--border-default) pt-5 sm:mt-6 sm:pt-6">
        {profile ? <ProfileSettingsForm key={profile.updated_at} profile={profile} /> : (
          <section aria-labelledby="profile-settings-unavailable-title">
            <div className="flex items-start gap-3 rounded-xl border border-(--border-muted) bg-(--surface-subtle) p-3 sm:p-4">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-(--status-warning)" />
              <div className="min-w-0"><h3 id="profile-settings-unavailable-title" className="font-semibold text-(--text-primary)">個人資料暫時無法載入</h3><p className="mt-1 text-sm leading-6 text-(--text-muted)">顯示名稱與頭像仍可管理；若重新整理後仍無法載入，請聯絡社團幹部。</p></div>
            </div>
          </section>
        )}
      </div>
    </SettingsCard>
  );
}

export default withServerErrorReference(ProfileSettingsPage, "/settings/profile");

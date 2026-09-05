import { CircleAlert } from "lucide-react";

import { ProfileClubFootprint } from "@/components/(authenticated)/profile/ProfileClubFootprint";
import { ProfileDetailsSection } from "@/components/(authenticated)/profile/ProfileDetailsSection";
import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { PageHeader } from "@/components/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { eventsService } from "@/services/events/events.service";
import { profileService } from "@/services/profile/profile.service";
import { usersService } from "@/services/users/users.service";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, totalBorrowings, attendanceCount, clubContext] =
    await Promise.all([
      usersService.getProfile(user.id),
      boardGamesService.getTotalBorrowedCount(user.id),
      eventsService.getAttendedCountByCurrentAcademicYear(user.id),
      profileService.getClubContext(user.id),
    ]);

  if (!profile) {
    return (
      <section className="container max-w-3xl space-y-6 py-6 sm:py-8">
        <PageHeader
          title="個人檔案"
          description="查看網站帳號與個人資料。"
        />
        <Card className="p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-(--status-warning)"
            />
            <div className="min-w-0">
              <h2 className="break-words font-semibold text-(--text-primary)">
                個人資料暫時無法載入
              </h2>
              <p className="mt-1 break-words text-sm leading-6 text-(--text-muted)">
                帳號仍可正常使用。你可以前往設定管理帳號資料；若個人資料持續缺失，請聯絡社團幹部協助確認。
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/settings" variant="outline">
              前往設定
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="text">
              返回儀表板
            </ButtonLink>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container max-w-5xl space-y-6 py-6 sm:space-y-8 sm:py-8">
      <ProfileHeroSection
        user={user}
        profile={profile}
        identityBadges={clubContext.identityBadges}
      />
      <ProfileClubFootprint
        totalBorrowedCount={totalBorrowings}
        attendedCount={attendanceCount}
        joinedAcademicYear={clubContext.joinedAcademicYear}
      />
      <ProfileDetailsSection
        profile={profile}
        currentMembership={clubContext.currentMembership}
        hasMembershipHistory={clubContext.hasMembershipHistory}
      />
    </section>
  );
}

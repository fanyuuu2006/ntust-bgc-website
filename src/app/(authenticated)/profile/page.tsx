import { ProfileBasicInfoSection } from "@/components/(authenticated)/profile/ProfileBasicInfoSection";
import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { QuickStatsSection } from "@/components/(authenticated)/profile/QuickStats";
import { getCurrentUser } from "@/libs/auth";
import { boardGameBorrowingsService } from "@/services/board-game-borrowings/board-game-borrowings.service.ts";
import { eventAttendancesService } from "@/services/event-attendances/event-attendances.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { usersService } from "@/services/users/users.service";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const [
    profileData,
    totalBorrowings,
    activeBorrowings,
    attendances,
    joinedYear,
  ] = await Promise.all([
    usersService.getProfileData(user.id),
    boardGameBorrowingsService.getTotalBorrowedCount(user.id),
    boardGameBorrowingsService.getActiveBorrowedCount(user.id),
    eventAttendancesService.getAttendedCountByCurrentAcademicYear(user.id),
    membershipService.getJoinedYear(user.id),
  ]);

  return (
    <main className="pb-8 sm:pb-12">
      <div className="container flex flex-col gap-5 py-6 sm:gap-6 sm:py-8">
        <ProfileHeroSection data={profileData} />
        <QuickStatsSection
          stats={[
          { key: "borrowings", label: "累計借用次數", value: totalBorrowings },
            {
              key: "active-borrowings",
              label: "目前借用中",
              value: activeBorrowings,
            },
            { key: "attendances", label: "本學年簽到次數", value: attendances },
            {
              key: "joined-year",
              label: "加入年份",
              value: joinedYear ?? "尚無紀錄",
            },
          ]}
        />
        <ProfileBasicInfoSection data={profileData} />
      </div>
    </main>
  );
}

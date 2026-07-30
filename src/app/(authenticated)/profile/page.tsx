import { ProfileBasicInfoSection } from "@/components/(authenticated)/profile/ProfileBasicInfoSection";
import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { QuickStatsSection } from "@/components/(authenticated)/profile/QuickStats";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
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
    boardGamesService.getTotalBorrowedCount(user.id),
    boardGamesService.getActiveBorrowedCount(user.id),
    eventAttendancesService.getAttendedCountByCurrentAcademicYear(user.id),
    membershipService.getJoinedYear(user.id),
  ]);

  return (
    <>
      <ProfileHeroSection data={profileData} />
      <QuickStatsSection
        stats={[
          {
            key: "borrowings",
            label: "累計借用桌遊次數",
            value: totalBorrowings,
          },
          {
            key: "active-borrowings",
            label: "目前借用中桌遊數量",
            value: activeBorrowings,
          },
          { key: "attendances", label: "本學年簽到次數", value: attendances },
          {
            key: "joined-year",
            label: "入社年份",
            value: joinedYear ?? "尚無紀錄",
          },
        ]}
      />
      <ProfileBasicInfoSection data={profileData} />
    </>
  );
}

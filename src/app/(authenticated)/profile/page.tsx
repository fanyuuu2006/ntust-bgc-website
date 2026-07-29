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
    eventAttendancesService.getAttendedCount(user.id),
    membershipService.getJoinedYear(user.id),
  ]);

  return (
    <>
      <ProfileHeroSection data={profileData} />
      <QuickStatsSection
        stats={[
          { key: "borrowings", label: "累計借用桌遊", value: totalBorrowings },
          {
            key: "active-borrowings",
            label: "目前借用桌遊",
            value: activeBorrowings,
          },
          { key: "attendances", label: "社課簽到次數", value: attendances },
          {
            key: "joined-year",
            label: "入社學年度",
            value: joinedYear ? joinedYear : "尚未入社",
          },
        ]}
      />
    </>
  );
}

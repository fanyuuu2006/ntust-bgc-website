import { ProfileBasicInfoSection } from "@/components/(authenticated)/profile/ProfileBasicInfoSection";
import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { QuickStatsSection } from "@/components/(authenticated)/profile/QuickStats";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { eventAttendancesService } from "@/services/event-attendances/event-attendances.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { usersService } from "@/services/users/users.service";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const [
    profile,
    totalBorrowings,
    currentlyBorrowings,
    attendances,
    joinedYear,
    currentMembership,
    currentOfficerPositions,
  ] = await Promise.all([
    usersService.getProfile(user.id),
    boardGamesService.getTotalBorrowedCount(user.id),
    boardGamesService.getCurrentlyBorrowedCount(user.id),
    eventAttendancesService.getAttendedCountByCurrentAcademicYear(user.id),
    membershipService.getJoinedYear(user.id),
    membershipService.getCurrentMembershipByUserId(user.id),
    officerPositionsService.getCurrentPositionsByUserId(user.id),
  ]);

  if (!profile) return null;

  return (
    <>
      <ProfileHeroSection
        user={user}
        profile={profile}
        currentMembership={currentMembership}
        currentOfficerPositions={currentOfficerPositions}
      />
      <QuickStatsSection
        stats={[
          {
            key: "borrowings",
            label: "累計借用桌遊次數",
            value: totalBorrowings,
          },
          {
            key: "currently-borrowings",
            label: "目前借用中桌遊數量",
            value: currentlyBorrowings,
          },
          { key: "attendances", label: "本學年簽到次數", value: attendances },
          {
            key: "joined-year",
            label: "入社年份",
            value: joinedYear ?? "尚無紀錄",
          },
        ]}
      />
      <ProfileBasicInfoSection user={user} profile={profile} />
    </>
  );
}

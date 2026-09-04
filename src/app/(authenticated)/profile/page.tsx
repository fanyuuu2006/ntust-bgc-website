import { ProfileBasicInfoSection } from "@/components/(authenticated)/profile/ProfileBasicInfoSection";
import { ProfileClubFootprint } from "@/components/(authenticated)/profile/ProfileClubFootprint";
import { ProfileClubInformation } from "@/components/(authenticated)/profile/ProfileClubInformation";
import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
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

  if (!profile) return null;

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
      <ProfileBasicInfoSection profile={profile} />
      <ProfileClubInformation
        currentMembership={clubContext.currentMembership}
        hasMembershipHistory={clubContext.hasMembershipHistory}
      />
    </section>
  );
}

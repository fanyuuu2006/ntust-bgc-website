import { AttendanceCard } from "@/components/(authenticated)/profile/AttendancesCard";
import { BorrowingCard } from "@/components/(authenticated)/profile/BorrowingCard";
import { MembershipCard } from "@/components/(authenticated)/profile/MembershipCard";
import { OfficerCard } from "@/components/(authenticated)/profile/OfficerCard";
import { ProfileBasicInfo } from "@/components/(authenticated)/profile/ProfileBasicInfo";
import { ProfileHeader } from "@/components/(authenticated)/profile/ProfileHeader";
import { getCurrentUser } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const profileData = await usersService.getProfilePageData(user.id);

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8">
        <ProfileHeader data={profileData} />

        <ProfileBasicInfo user={profileData} profile={profileData.profile} />

        <div className="grid gap-6 md:grid-cols-2">
          <MembershipCard membership={profileData.membership} />
          <OfficerCard officerPosition={profileData.officerPositions[0]} />
        </div>

        {/* 借閱／活動資料源尚未實作，先傳空陣列保留版面 */}
        <BorrowingCard borrowings={[]} />
        <AttendanceCard attendances={[]} />
      </div>
    </section>
  );
}

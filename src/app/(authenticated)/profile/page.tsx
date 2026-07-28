import { notFound } from "next/navigation";
import { getCurrentUser } from "@/libs/auth";
import { AttendanceCard } from "@/components/(authenticated)/profile/AttendancesCard";
import { BorrowingCard } from "@/components/(authenticated)/profile/BorrowingCard";
import { MembershipCard } from "@/components/(authenticated)/profile/MembershipCard";
import { OfficerPositionsCard } from "@/components/(authenticated)/profile/OfficerPostionsCard";
import { ProfileBasicInfo } from "@/components/(authenticated)/profile/ProfileBasicInfo";
import { ProfileHeader } from "@/components/(authenticated)/profile/ProfileHeader";
import { usersService } from "@/services/users/users.service";

// ⚠️ usersService.getProfileData(...) 是示意用的方法名稱，
// 請替換成專案實際的 service/repository 呼叫方式。
export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const data = await usersService.getProfileData(user.id);

  // 借閱／出席尚未有 repository/service，先以空陣列讓 UI 骨架就位
  const borrowings: never[] = [];
  const attendances: never[] = [];

  return (
    <section>
      <div className="container flex flex-col gap-6 py-8">
        <ProfileHeader data={data} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ProfileBasicInfo user={data} profile={data.profile} />
          </div>

          <MembershipCard membership={data.membership} />
          <OfficerPositionsCard officerPositions={data.officerPositions} />
          <BorrowingCard borrowings={borrowings} />
          <AttendanceCard attendances={attendances} />
        </div>
      </div>
    </section>
  );
}

import { HistorySection } from "@/components/(authenticated)/profile/HistorySection";
import { ProfileBasicInfoSection } from "@/components/(authenticated)/profile/ProfileBasicInfoSection";
import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { QuickStatsSection } from "@/components/(authenticated)/profile/QuickStats";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { eventAttendancesService } from "@/services/event-attendances/event-attendances.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { usersService } from "@/services/users/users.service";

const BORROWING_STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "muted" }
> = {
  pending: { label: "審核中", variant: "warning" },
  approved: { label: "已核准", variant: "warning" },
  borrowed: { label: "借用中", variant: "success" },
  returned: { label: "已歸還", variant: "muted" },
  rejected: { label: "已拒絕", variant: "danger" },
};

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
    boardGameBorrowingHistory,
    membershipHistory,
  ] = await Promise.all([
    usersService.getProfile(user.id),
    boardGamesService.getTotalBorrowedCount(user.id),
    boardGamesService.getCurrentlyBorrowedCount(user.id),
    eventAttendancesService.getAttendedCountByCurrentAcademicYear(user.id),
    membershipService.getJoinedYear(user.id),
    membershipService.getCurrentMembershipByUserId(user.id),
    officerPositionsService.getCurrentPositionsByUserId(user.id),
    boardGamesService.getBorrowingsByUserId(user.id, {
      page: 1,
      pageSize: 5,
    }),
    membershipService.getMembershipsByUserId(user.id, { pageSize: 5 }),
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
      <HistorySection
        groups={[
          {
            key: "board-game-borrowings",
            title: "桌遊借用紀錄",
            viewAllHref: "/borrowings",
            emptyText: "尚無借用紀錄",
            items: boardGameBorrowingHistory.data.map((borrowing) => ({
              key: borrowing.id,
              title: borrowing.board_game?.name ?? "未知桌遊",
              subtitle: borrowing.board_game?.inventory_number,
              statusLabel:
                BORROWING_STATUS_MAP[borrowing.status]?.label ??
                borrowing.status,
              statusVariant:
                BORROWING_STATUS_MAP[borrowing.status]?.variant ?? "muted",
              date: new Date(borrowing.created_at).toLocaleDateString("zh-TW"),
            })),
          },
          {
            key: "memberships",
            title: "社員資格紀錄",
            viewAllHref: "/memberships",
            emptyText: "尚無社員資格紀錄",
            items: membershipHistory.data.map((membership) => ({
              key: membership.id,
              title: membership.type === "lifetime" ? "永久社員" : "年度社員",
              subtitle: membership.academic_year?.year
                ? `${membership.academic_year.year} 學年度`
                : undefined,
              statusLabel:
                membership.status === "active"
                  ? "生效中"
                  : membership.status === "expired"
                    ? "已過期"
                    : membership.status === "pending"
                      ? "審核中"
                      : membership.status === "suspended"
                        ? "已停權"
                        : "已取消",
              statusVariant:
                membership.status === "active"
                  ? "success"
                  : membership.status === "expired" ||
                      membership.status === "cancelled"
                    ? "muted"
                    : membership.status === "suspended"
                      ? "danger"
                      : "warning",
              date: new Date(membership.joined_at).toLocaleDateString("zh-TW"),
            })),
          },
          {
            key: "attendances",
            title: "簽到紀錄",
            viewAllHref: "/attendance",
            emptyText: "尚無簽到紀錄",
            items: [],
          },
        ]}
      />
      <ProfileBasicInfoSection user={user} profile={profile} />
    </>
  );
}

import {
  HistoryItem,
  HistorySection,
} from "@/components/(authenticated)/profile/HistorySection";
import { ProfileBasicInfoSection } from "@/components/(authenticated)/profile/ProfileBasicInfoSection";
import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { getCurrentUser } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { usersService } from "@/services/users/users.service";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { eventsService } from "@/services/events/events.service";
import { BoardGameBorrowingWithBoardGame } from "@/services/board-games/board-games.types";
import { EventAttendanceWithEvent } from "@/repositories/event-attendances.repository";
import { formatDate } from "@/utils/date";
import { QuickStats } from "@/components/QuickStats";

type HistoryVariant = HistoryItem["statusVariant"];

const BORROWING_STATUS_MAP: Record<
  string,
  { label: string; variant: HistoryVariant }
> = {
  pending: { label: "審核中", variant: "warning" },
  approved: { label: "已核准", variant: "warning" },
  borrowed: { label: "借用中", variant: "success" },
  returned: { label: "已歸還", variant: "muted" },
  rejected: { label: "已拒絕", variant: "danger" },
};

const MEMBERSHIP_STATUS_MAP: Record<
  string,
  { label: string; variant: HistoryVariant }
> = {
  pending: { label: "審核中", variant: "warning" },
  active: { label: "生效中", variant: "success" },
  expired: { label: "已過期", variant: "muted" },
  suspended: { label: "已停權", variant: "danger" },
  cancelled: { label: "已取消", variant: "muted" },
};

const ATTENDANCE_STATUS_MAP: Record<
  string,
  { label: string; variant: HistoryVariant }
> = {
  present: { label: "已簽到", variant: "success" },
  late: { label: "遲到", variant: "warning" },
  absent: { label: "缺席", variant: "danger" },
};

function toBorrowingHistoryItem(
  borrowing: BoardGameBorrowingWithBoardGame,
): HistoryItem {
  const status = BORROWING_STATUS_MAP[borrowing.status];

  return {
    key: String(borrowing.id),
    title: borrowing.board_game.name ?? "未知桌遊",
    subtitle: `編號:${borrowing.board_game.inventory_number}`,
    statusLabel: status?.label ?? borrowing.status,
    statusVariant: status?.variant ?? "muted",
    date: formatDate(borrowing.created_at),
  };
}

function toMembershipHistoryItem(
  membership: MembershipWithAcademicYear,
): HistoryItem {
  const status = MEMBERSHIP_STATUS_MAP[membership.status];

  return {
    key: membership.id,
    title: membership.type === "lifetime" ? "永久社員" : "一般社員",
    subtitle: membership.academic_year?.year
      ? `${membership.academic_year.year} 學年度`
      : undefined,
    statusLabel: status?.label ?? membership.status,
    statusVariant: status?.variant ?? "muted",
    date: membership.joined_at ? formatDate(membership.joined_at) : "尚未啟用",
  };
}

function toAttendanceHistoryItem(
  attendance: EventAttendanceWithEvent,
): HistoryItem {
  const status = ATTENDANCE_STATUS_MAP[attendance.status];

  return {
    key: String(attendance.id),
    title: attendance.event?.name ?? "未知",
    statusLabel: status?.label ?? attendance.status,
    statusVariant: status?.variant ?? "muted",
    date: attendance.attended_at
      ? formatDate(attendance.attended_at)
      : undefined,
  };
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [
    profile,
    totalBorrowings,
    currentlyBorrowings,
    attendanceCount,
    joinedYear,
    currentMembership,
    currentOfficerPositions,
    boardGameBorrowingHistory,
    membershipHistory,
    attendanceHistory,
  ] = await Promise.all([
    usersService.getProfile(user.id),
    boardGamesService.getTotalBorrowedCount(user.id),
    boardGamesService.getCurrentlyBorrowedCount(user.id),
    eventsService.getAttendedCountByCurrentAcademicYear(user.id),
    membershipService.getJoinedYear(user.id),
    membershipService.getCurrentMembershipByUserId(user.id),
    officerPositionsService.getCurrentPositionsByUserId(user.id),
    boardGamesService.getBorrowingsByUserId(user.id, {
      page: 1,
      pageSize: 5,
    }),
    membershipService.getMembershipsByUserId(user.id, { pageSize: 5 }),
    eventsService.getAttendancesByUserId(user.id, {
      page: 1,
      pageSize: 5,
    }),
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
      <section aria-labelledby="profile-stats-title">
        <div className="container">
          <div className="mb-3">
            <h2
              id="profile-stats-title"
              className="text-base font-bold text-(--foreground) sm:text-lg"
            >
              統計資訊
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <QuickStats
              stats={[
                {
                  key: "borrowings",
                  label: "累計借用桌遊次數",
                  value: totalBorrowings,
                },
                {
                  key: "currently-borrowings",
                  label: "借用中桌遊數量",
                  value: currentlyBorrowings,
                },
                {
                  key: "attendances",
                  label: "本學年簽到次數",
                  value: attendanceCount,
                },
                {
                  key: "joined-year",
                  label: "入社學年",
                  value: joinedYear ?? "尚無紀錄",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <HistorySection
        groups={[
          {
            key: "board-game-borrowings",
            title: "桌遊借用紀錄",
            viewAllHref: "/borrowings",
            emptyText: "尚無借用紀錄",
            items: boardGameBorrowingHistory.data.map(toBorrowingHistoryItem),
          },
          {
            key: "memberships",
            title: "社員資格紀錄",
            viewAllHref: "/memberships",
            emptyText: "尚無社員資格紀錄",
            items: membershipHistory.data.map(toMembershipHistoryItem),
          },
          {
            key: "attendances",
            title: "簽到紀錄",
            // viewAllHref: "/attendance",
            emptyText: "尚無簽到紀錄",
            items: attendanceHistory.data.map(toAttendanceHistoryItem),
          },
        ]}
      />
      <ProfileBasicInfoSection user={user} profile={profile} />
    </>
  );
}

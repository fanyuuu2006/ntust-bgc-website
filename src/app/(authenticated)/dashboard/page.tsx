import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

import { DashboardBorrowingSummary } from "@/components/(authenticated)/dashboard/DashboardBorrowingSummary";
import { DashboardMembershipSummary } from "@/components/(authenticated)/dashboard/DashboardMembershipSummary";
import { SelfCheckInEvents } from "@/components/(authenticated)/dashboard/SelfCheckInEvents";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/libs/auth";
import { announcementsService } from "@/services/announcements/announcements.service";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { eventsService } from "@/services/events/events.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { formatDate } from "@/utils/date";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [academicYears, openBorrowings, announcements] = await Promise.all([
    membershipService.listAcademicYears(),
    boardGamesService.getDashboardOpenBorrowingsByUserId(user.id),
    announcementsService.listPublished({ page: 1, pageSize: 3 }),
  ]);
  const currentAcademicYear = academicYears.find((year) => year.is_current);
  const currentYearMembership = currentAcademicYear
    ? await membershipService.getMembershipByUserIdAndAcademicYearId(
      user.id,
      currentAcademicYear.id,
    )
    : null;
  const selfCheckInEvents = currentYearMembership?.status === "active"
    ? await eventsService.getSelfCheckInEventsForUser(user.id)
    : [];

  return (
    <section className="container space-y-10 py-8">
      <PageHeader title={`歡迎回來，${user.name}`} />

      <SelfCheckInEvents events={selfCheckInEvents} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:items-start">
        <DashboardBorrowingSummary borrowings={openBorrowings} />
        <DashboardMembershipSummary
          membership={currentYearMembership}
          academicYearLabel={currentAcademicYear?.year}
        />
      </div>

      <section aria-labelledby="dashboard-announcements-title">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="dashboard-announcements-title"
            className="flex items-center gap-2 text-xl font-semibold text-(--text-primary)"
          >
            <Megaphone aria-hidden="true" className="size-5 text-(--interactive-primary)" />
            最新公告
          </h2>
          <Link
            href="/announcements"
            className="inline-flex items-center gap-1 text-sm font-medium text-(--action) hover:text-(--action-hover) hover:underline"
          >
            查看全部
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        {announcements.data.length ? (
          <ul className="mt-4 divide-y divide-(--border-muted)">
            {announcements.data.map((announcement) => (
              <li key={announcement.id}>
                <Link
                  href={`/announcements/${announcement.id}`}
                  className="block rounded-lg px-1 py-4 transition-colors hover:bg-(--surface-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--interactive-primary)"
                >
                  <p className="font-medium text-(--text-primary)">{announcement.title}</p>
                  <p className="mt-1 text-xs text-(--text-muted)">
                    {formatDate(announcement.published_at ?? announcement.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-(--text-muted)">目前沒有已發布的公告。</p>
        )}
      </section>
    </section>
  );
}

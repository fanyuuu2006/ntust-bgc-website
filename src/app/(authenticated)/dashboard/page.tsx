import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

import { DashboardBorrowingSummary } from "@/components/(authenticated)/dashboard/DashboardBorrowingSummary";
import { DashboardMembershipSummary } from "@/components/(authenticated)/dashboard/DashboardMembershipSummary";
import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { SelfCheckInEvents } from "@/components/(authenticated)/dashboard/SelfCheckInEvents";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
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
    announcementsService.getDashboardLatestPublished(),
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
    <section className="container py-8">
      <div className="max-w-[72rem] space-y-6">
        <PageHeader title={`歡迎回來，${user.name}`} />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            <SelfCheckInEvents events={selfCheckInEvents} />
            <DashboardBorrowingSummary borrowings={openBorrowings} />
          </div>

          <div className="space-y-5">
            <DashboardMembershipSummary
              membership={currentYearMembership}
              academicYearLabel={currentAcademicYear?.year}
            />

            <Card className="p-4">
              <section aria-labelledby="dashboard-announcements-title">
                <DashboardSectionHeader
                  id="dashboard-announcements-title"
                  icon={<Megaphone aria-hidden="true" className="size-5 text-(--status-warning)" />}
                  title="最新公告"
                  action={
                    <Link
                      href="/announcements"
                      className="inline-flex items-center gap-1 text-sm font-medium text-(--action) hover:text-(--action-hover) hover:underline"
                    >
                      查看全部
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  }
                />

                {announcements.data.length ? (
                  <ul className="mt-3 divide-y divide-(--border-muted)">
                    {announcements.data.map((announcement) => (
                      <li key={announcement.id}>
                        <Link
                          href={`/announcements/${announcement.id}`}
                          className="block rounded-lg py-2.5 transition-colors hover:bg-(--surface-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--interactive-primary)"
                        >
                          <p className="break-words font-medium text-(--text-primary)">{announcement.title}</p>
                          <p className="mt-1 text-xs text-(--text-muted)">
                            {formatDate(announcement.published_at ?? announcement.created_at)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-(--text-muted)">目前還沒有已發布的公告。</p>
                )}
              </section>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

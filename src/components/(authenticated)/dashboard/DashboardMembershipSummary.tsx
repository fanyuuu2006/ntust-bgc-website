import { ArrowRight, BadgeCheck, KeyRound } from "lucide-react";

import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { MembershipStatusBadge } from "@/components/MembershipStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { MEMBERSHIP_TYPE_LABEL } from "@/utils/membership";

export function DashboardMembershipSummary({
  membership,
  academicYearLabel,
}: {
  membership: MembershipWithAcademicYear | null;
  academicYearLabel?: string;
}) {
  const hasCurrentMembership = Boolean(membership);
  const academicYear = membership?.academic_year?.year ?? academicYearLabel;
  const hasCurrentAcademicYear = Boolean(academicYear);

  return (
    <Card
      surface={hasCurrentMembership ? "default" : "subtle"}
      className="p-4"
    >
      <section aria-labelledby="dashboard-membership-title">
        <DashboardSectionHeader
          id="dashboard-membership-title"
          icon={
            hasCurrentMembership ? (
              <BadgeCheck
                aria-hidden="true"
                className="size-5 text-(--status-success)"
              />
            ) : (
              <KeyRound aria-hidden="true" className="size-5" />
            )
          }
          title="本學年度社員身分"
          action={
            hasCurrentMembership ? (
              <ButtonLink
                href="/memberships"
                variant="text"
                size="sm"
                className="shrink-0 px-0"
              >
                查看社員資格
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
            ) : undefined
          }
        />

        {membership ? (
          <div className="mt-3 min-w-0">
            <p className="wrap-break-word text-lg font-semibold text-(--text-primary)">
              {academicYear ?? "本"} 學年度
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-(--text-secondary)">
                {MEMBERSHIP_TYPE_LABEL[membership.type]}
              </span>
              <span aria-hidden="true" className="text-(--text-muted)">
                ·
              </span>
              <MembershipStatusBadge status={membership.status} />
            </div>
          </div>
        ) : hasCurrentAcademicYear ? (
          <div className="mt-3 min-w-0">
            <p className="font-semibold text-(--text-primary)">
              尚未取得 {academicYear} 學年度社員資格
            </p>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              若要加入本學年度社團，可前往社員資格頁查看入社方式。
            </p>
            <ButtonLink
              href="/memberships"
              variant="outline"
              size="sm"
              className="mt-3"
            >
              前往社員資格
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        ) : (
          <div className="mt-3 min-w-0">
            <p className="font-semibold text-(--text-primary)">
              目前尚未設定可入社的學年度
            </p>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              社團尚未開放新的學年度入社；既有社員紀錄仍可前往社員資格頁查看。
            </p>
            <ButtonLink
              href="/memberships"
              variant="outline"
              size="sm"
              className="mt-3"
            >
              查看社員資格
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        )}
      </section>
    </Card>
  );
}

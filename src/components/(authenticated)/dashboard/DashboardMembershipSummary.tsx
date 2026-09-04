import { ArrowRight, BadgeCheck, KeyRound } from "lucide-react";

import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { MembershipStatusBadge } from "@/components/MembershipStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatDate } from "@/utils/date";
import { MEMBERSHIP_TYPE_LABEL } from "@/utils/membership";

export function DashboardMembershipSummary({
  membership,
  academicYearLabel,
}: {
  membership: MembershipWithAcademicYear | null;
  academicYearLabel?: string;
}) {
  const hasCurrentMembership = Boolean(membership);
  const academicYear = membership?.academic_year?.year ?? academicYearLabel ?? "目前";

  return (
    <Card surface={hasCurrentMembership ? "default" : "elevated"} className="p-4">
      <section aria-labelledby="dashboard-membership-title">
        <DashboardSectionHeader
          id="dashboard-membership-title"
          icon={hasCurrentMembership
            ? <BadgeCheck aria-hidden="true" className="size-5 text-(--status-success)" />
            : <KeyRound aria-hidden="true" className="size-5" />}
          title="社員資格"
          action={hasCurrentMembership ? (
            <ButtonLink href="/memberships" variant="text" size="sm" className="shrink-0 px-0">
              查看
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          ) : undefined}
        />

        {membership ? (
          <div className="mt-3 min-w-0">
            <p className="break-words text-xl font-semibold text-(--text-primary)">{academicYear} 學年度</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-(--text-secondary)">{MEMBERSHIP_TYPE_LABEL[membership.type]}</span>
              <span aria-hidden="true" className="text-(--text-muted)">·</span>
              <MembershipStatusBadge status={membership.status} />
            </div>
            {membership.joined_at ? (
              <p className="mt-2 text-sm text-(--text-muted)">完成入社：{formatDate(membership.joined_at)}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 min-w-0">
            <p className="font-semibold text-(--text-primary)">尚未完成 {academicYear} 學年度入社</p>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">完成入社後，可使用社員資格相關服務與紀錄。</p>
            <ButtonLink href="/memberships" variant="primary" size="sm" className="mt-3">
              前往社員資格
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        )}
      </section>
    </Card>
  );
}

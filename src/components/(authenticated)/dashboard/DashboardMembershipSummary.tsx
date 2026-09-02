import { ArrowRight, BadgeCheck, KeyRound } from "lucide-react";

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
  if (!membership) {
    return (
      <Card surface="elevated" className="p-5">
        <div className="flex items-start gap-3">
          <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-(--interactive-primary)" />
          <div>
            <h2 className="text-lg font-semibold text-(--text-primary)">
              尚未完成 {academicYearLabel ?? "本"} 學年度入社
            </h2>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              使用社員註冊序號完成入社後，即可建立本學年度社員資格。
            </p>
          </div>
        </div>
        <ButtonLink href="/memberships" variant="primary" size="sm" className="mt-4">
          前往社員資格
          <ArrowRight aria-hidden="true" className="size-4" />
        </ButtonLink>
      </Card>
    );
  }

  const academicYear = membership.academic_year?.year ?? academicYearLabel ?? "—";

  return (
    <section aria-labelledby="dashboard-membership-title" className="px-1">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="dashboard-membership-title"
          className="flex items-center gap-2 text-xl font-semibold text-(--text-primary)"
        >
          <BadgeCheck aria-hidden="true" className="size-5 text-(--status-success)" />
          社員資格
        </h2>
        <ButtonLink href="/memberships" variant="text" size="sm" className="px-0">
          查看
          <ArrowRight aria-hidden="true" className="size-4" />
        </ButtonLink>
      </div>
      <p className="mt-4 text-2xl font-semibold text-(--text-primary)">
        {academicYear} 學年度
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-(--text-secondary)">
          {MEMBERSHIP_TYPE_LABEL[membership.type]}
        </span>
        <span aria-hidden="true" className="text-(--text-muted)">·</span>
        <MembershipStatusBadge status={membership.status} />
      </div>
      {membership.joined_at ? (
        <p className="mt-3 text-sm text-(--text-muted)">
          完成入社：{formatDate(membership.joined_at)}
        </p>
      ) : null}
    </section>
  );
}

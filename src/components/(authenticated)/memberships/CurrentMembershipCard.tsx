import { BadgeCheck } from "lucide-react";

import { MembershipStatusBadge } from "@/components/MembershipStatusBadge";
import { Card } from "@/components/ui/Card";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatDate } from "@/utils/date";
import { MEMBERSHIP_TYPE_LABEL } from "@/utils/membership";

export function CurrentMembershipCard({
  membership,
}: {
  membership: MembershipWithAcademicYear;
}) {
  const academicYear = membership.academic_year?.year ?? "—";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-(--interactive-primary)">
            <BadgeCheck aria-hidden="true" className="size-4" />
            目前社員資格
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-(--text-primary) sm:text-3xl">
            {academicYear} 學年度
          </h2>
          <p className="mt-1 text-base text-(--text-secondary)">
            {MEMBERSHIP_TYPE_LABEL[membership.type]}
          </p>
        </div>
        <MembershipStatusBadge status={membership.status} />
      </div>

      <div className="mt-5 border-t border-(--border-muted) pt-4 text-sm">
        <p className="text-(--text-primary)">{getMembershipStatusCopy(membership.status)}</p>
        {membership.joined_at ? (
          <p className="mt-1 text-(--text-muted)">
            完成入社：{formatDate(membership.joined_at)}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function getMembershipStatusCopy(status: MembershipWithAcademicYear["status"]) {
  if (status === "active") return "你已完成本學年度入社。";
  if (status === "pending") return "社員資格正在處理中。";
  if (status === "suspended") return "社員資格目前已停用。";
  if (status === "expired") return "社員資格已失效。";
  return "社員資格已取消。";
}

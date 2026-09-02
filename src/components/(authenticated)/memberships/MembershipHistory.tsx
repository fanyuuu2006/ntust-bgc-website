import { History } from "lucide-react";
import type { ReactNode } from "react";

import { MembershipStatusBadge } from "@/components/MembershipStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatDate } from "@/utils/date";
import { MEMBERSHIP_TYPE_LABEL } from "@/utils/membership";

export function MembershipHistory({
  memberships,
  currentMembershipId,
  controls,
  pagination,
}: {
  memberships: MembershipWithAcademicYear[];
  currentMembershipId?: string;
  controls?: ReactNode;
  pagination?: ReactNode;
}) {
  return (
    <section aria-labelledby="membership-records-title">
      <div>
        <h2
          id="membership-records-title"
          className="flex items-center gap-2 text-xl font-semibold text-(--text-primary)"
        >
          <History aria-hidden="true" className="size-5 text-(--interactive-primary)" />
          社員紀錄
        </h2>
        <p className="mt-1 text-sm text-(--text-muted)">
          查看所有學年度的社員資格紀錄。
        </p>
      </div>

      {controls ? <div className="mt-4">{controls}</div> : null}

      {memberships.length === 0 ? (
        <EmptyState
          compact
          className="mt-4 border border-(--border-default) bg-(--surface-subtle) p-5 text-left"
          title="找不到符合條件的社員紀錄"
        />
      ) : (
        <ul className="mt-4 grid gap-3">
          {memberships.map((membership) => {
            const academicYear = membership.academic_year?.year ?? "—";
            const isCurrent = membership.id === currentMembershipId;

            return (
              <li key={membership.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-(--text-primary)">
                          {academicYear} 學年度
                        </p>
                        {isCurrent ? <Badge tone="info">目前</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-(--text-secondary)">
                        {MEMBERSHIP_TYPE_LABEL[membership.type]}
                      </p>
                      <p className="mt-3 text-sm text-(--text-muted)">
                        {membership.joined_at
                          ? `完成入社：${formatDate(membership.joined_at)}`
                          : "完成入社日期待確認"}
                      </p>
                    </div>
                    <MembershipStatusBadge status={membership.status} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {pagination ? <div className="mt-5">{pagination}</div> : null}
    </section>
  );
}

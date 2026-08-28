import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatDate } from "@/utils/date";
import { MembershipStatusBadge } from "./MembershipStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export function MembershipHistory({
  memberships,
}: {
  memberships: MembershipWithAcademicYear[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-(--text-primary)">
          歷年社員紀錄
        </h2>
        <p className="mt-1 text-sm text-(--text-muted)">
          保留你各學年度的社員資格與狀態。
        </p>
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          className="p-5 text-left"
          description="目前沒有社員紀錄。"
        />
      ) : (
        <div className="card divide-y divide-(--border-muted)">
          {memberships.map((membership) => (
            <article
              key={membership.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-(--text-primary)">
                  {membership.type === "lifetime"
                    ? "永久社員"
                    : `${membership.academic_year?.year ?? "-"} 學年度 · 一般社員`}
                </p>
                <p className="mt-1 text-sm text-(--text-muted)">
                  {membership.joined_at
                    ? `${formatDate(membership.joined_at)} 加入`
                    : "尚未啟用"}
                </p>
              </div>
              <MembershipStatusBadge status={membership.status} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

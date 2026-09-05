import { MembershipStatusBadge } from "@/components/MembershipStatusBadge";
import { Pagination } from "@/components/Pagination/Pagination";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { membershipService } from "@/services/memberships/memberships.service";
import type { MembershipStatus, MembershipType } from "@/types/database";
import { formatDate } from "@/utils/date";
import { MEMBERSHIP_TYPE_LABEL } from "@/utils/membership";

export type MembershipRecordsResultQuery = {
  page: number;
  pageSize: number;
  search?: string;
  type?: MembershipType;
  status?: MembershipStatus;
  orderBy?: "academic_year";
  orderDirection: "asc" | "desc";
};

export async function MembershipRecordsResults({
  userId,
  currentMembershipId,
  query,
}: {
  userId: string;
  currentMembershipId?: string;
  query: MembershipRecordsResultQuery;
}) {
  const membershipRecords =
    await membershipService.listMembershipRecordsByUserId(userId, query);
  const hasQuery = Boolean(
    query.search ||
      query.type ||
      query.status ||
      query.orderDirection === "asc" ||
      query.page > 1,
  );

  return (
    <>
      {membershipRecords.data.length === 0 && hasQuery ? (
        <QueryEmptyState
          className="mt-4"
          title="找不到符合條件的社員紀錄"
          clearHref="/memberships"
        />
      ) : membershipRecords.data.length === 0 ? (
        <EmptyState
          compact
          className="mt-4 border border-(--border-default) bg-(--surface-subtle) p-5 text-left"
          title="目前沒有社員紀錄"
        />
      ) : (
        <ul className="mt-4 grid gap-3">
          {membershipRecords.data.map((membership) => {
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

      <div className="mt-5">
        <Pagination
          page={membershipRecords.page}
          pageSize={membershipRecords.pageSize}
          total={membershipRecords.total}
          totalPages={membershipRecords.totalPages}
          basePath="/memberships"
          query={{
            search: query.search,
            type: query.type,
            status: query.status,
            orderBy: "academic_year",
            orderDirection: query.orderDirection,
          }}
          showPageSize={false}
        />
      </div>
    </>
  );
}

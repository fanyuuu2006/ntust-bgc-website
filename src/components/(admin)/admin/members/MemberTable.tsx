import {
  MemberStatusBadge,
  MembershipTypeLabel,
} from "@/components/(admin)/admin/members/MemberStatusBadge";
import type { AdminMembership } from "@/services/memberships/memberships.types";
import { cn } from "@/utils/className";
import { formatDate } from "@/utils/date";

type MemberTableProps = React.HTMLAttributes<HTMLDivElement> & {
  memberships: AdminMembership[];
  hasFilters?: boolean;
};

export function MemberTable({
  memberships,
  hasFilters = false,
  className,
  ...rest
}: MemberTableProps) {
  if (memberships.length === 0) {
    return (
      <div className={cn("card p-8 text-center", className)} {...rest}>
        <p className="text-sm font-medium text-(--foreground)">
          {hasFilters ? "目前沒有符合條件的社員" : "目前尚無社員資料"}
        </p>
        <p className="mt-1 text-sm text-(--muted)">
          {hasFilters
            ? "調整搜尋或篩選條件後再試一次。"
            : "正式社員資格建立後會出現在這裡。"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} {...rest}>
      <div className="grid gap-3 md:hidden">
        {memberships.map((membership) => (
          <article key={membership.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-(--foreground)">
                  {membership.user_profile?.real_name || membership.user.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-(--muted)">
                  {membership.user.email}
                </p>
              </div>
              <MemberStatusBadge status={membership.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="學年度">
                {membership.academic_year?.year ?? "-"} 學年度
              </Info>
              <Info label="社員類型">
                <MembershipTypeLabel type={membership.type} />
              </Info>
              <Info label="學號">
                {membership.user_profile?.student_id ?? "-"}
              </Info>
              <Info label="系級">
                {[membership.user_profile?.department, membership.user_profile?.grade]
                  .filter(Boolean)
                  .join(" ") || "-"}
              </Info>
              <Info label="加入日期">
                {membership.joined_at ? formatDate(membership.joined_at) : "-"}
              </Info>
            </dl>
          </article>
        ))}
      </div>

      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--secondary-background)">
            <tr className="border-b border-(--border)">
              <HeaderCell>社員</HeaderCell>
              <HeaderCell>學號</HeaderCell>
              <HeaderCell>系級</HeaderCell>
              <HeaderCell>學年度</HeaderCell>
              <HeaderCell>類型</HeaderCell>
              <HeaderCell>狀態</HeaderCell>
              <HeaderCell>加入日期</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {memberships.map((membership) => (
              <tr
                key={membership.id}
                className="border-b border-(--border) last:border-0 hover:bg-(--secondary-background)"
              >
                <BodyCell>
                  <p className="font-medium text-(--foreground)">
                    {membership.user_profile?.real_name || membership.user.name}
                  </p>
                  <p className="mt-0.5 text-xs text-(--muted)">
                    {membership.user.email}
                  </p>
                </BodyCell>
                <BodyCell className="font-mono text-xs">
                  {membership.user_profile?.student_id ?? "-"}
                </BodyCell>
                <BodyCell>
                  <p>{membership.user_profile?.department ?? "-"}</p>
                  <p className="mt-0.5 text-xs">
                    {membership.user_profile?.grade ?? ""}
                  </p>
                </BodyCell>
                <BodyCell className="whitespace-nowrap">
                  {membership.academic_year?.year ?? "-"} 學年度
                </BodyCell>
                <BodyCell className="whitespace-nowrap">
                  <MembershipTypeLabel type={membership.type} />
                </BodyCell>
                <BodyCell>
                  <MemberStatusBadge status={membership.status} />
                </BodyCell>
                <BodyCell className="whitespace-nowrap">
                  {membership.joined_at ? formatDate(membership.joined_at) : "-"}
                </BodyCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 font-medium whitespace-nowrap text-(--muted)">
      {children}
    </th>
  );
}

function BodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-3 py-2 align-middle text-(--muted)", className)}>
      {children}
    </td>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-(--muted)">{label}</dt>
      <dd className="mt-1 text-(--foreground)">{children}</dd>
    </div>
  );
}

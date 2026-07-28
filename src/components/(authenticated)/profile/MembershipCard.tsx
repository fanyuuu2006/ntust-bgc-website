import { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatDate } from "@/utils/date";

type MembershipCardProps = {
  membership: MembershipWithAcademicYear | null;
};

const MEMBERSHIP_TYPE_LABEL: Record<string, string> = {
  annual: "一般社員",
  lifetime: "永久社員",
};

const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  pending: "審核中",
  active: "生效中",
  expired: "已過期",
  suspended: "已停權",
  cancelled: "已取消",
};

export function MembershipCard({ membership }: MembershipCardProps) {
  return (
    <div
      className="card rounded-2xl accent p-6"
      aria-labelledby="membership-heading"
    >
      <h2
        id="membership-heading"
        className="mb-4 text-sm font-semibold text-(--muted)"
      >
        目前社員資格
      </h2>

      {membership ? (
        <div className="flex flex-col gap-2">
          <p className="text-lg font-bold text-(--foreground)">
            {membership.academic_year.year} 學年度
          </p>
          <p className="text-sm text-(--muted)">
            {MEMBERSHIP_TYPE_LABEL[membership.type]} ・{" "}
            {MEMBERSHIP_STATUS_LABEL[membership.status]}
          </p>
          <p className="text-xs text-(--muted)">
            加入日期：{formatDate(membership.joined_at)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-(--muted)">目前非社員</p>
      )}
    </div>
  );
}

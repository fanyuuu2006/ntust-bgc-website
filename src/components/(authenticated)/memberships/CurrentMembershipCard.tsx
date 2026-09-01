import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatDate } from "@/utils/date";
import { MembershipStatusBadge } from "./MembershipStatusBadge";

export function CurrentMembershipCard({
  membership,
  emptyMessage,
}: {
  membership: MembershipWithAcademicYear | null;
  emptyMessage?: string;
}) {
  if (!membership) {
    return (
      <section className="card p-5">
        <p className="text-sm font-medium text-(--interactive-primary)">目前社員資格</p>
        <h2 className="mt-2 text-xl font-semibold text-(--text-primary)">
          目前沒有有效社員資格
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--text-muted)">
          {emptyMessage ??
            "完成本學年度入社繳費後，可使用幹部提供的註冊序號啟用社員資格。"}
        </p>
      </section>
    );
  }

  const title = `${membership.academic_year?.year ?? "目前"} 學年度`;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-(--interactive-primary)">目前社員資格</p>
          <h2 className="mt-1 text-2xl font-semibold text-(--text-primary)">
            {title}
          </h2>
          <p className="mt-1 text-sm text-(--text-muted)">
            {membership.type === "lifetime" ? "終生社員" : "一般社員"}
          </p>
        </div>
        <MembershipStatusBadge status={membership.status} />
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-(--text-muted)">加入時間</dt>
          <dd className="mt-1 text-(--text-primary)">
            {membership.joined_at ? formatDate(membership.joined_at) : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-(--text-muted)">資格來源</dt>
          <dd className="mt-1 text-(--text-primary)">
            {membership.membership_register_key_id ? "註冊序號啟用" : "管理端建立"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

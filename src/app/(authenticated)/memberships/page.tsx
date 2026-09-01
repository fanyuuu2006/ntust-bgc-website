import { CurrentMembershipCard } from "@/components/(authenticated)/memberships/CurrentMembershipCard";
import { MembershipActivationForm } from "@/components/(authenticated)/memberships/MembershipActivationForm";
import { MembershipHistory } from "@/components/(authenticated)/memberships/MembershipHistory";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/libs/auth";
import { membershipService } from "@/services/memberships/memberships.service";

export default async function MembershipsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [academicYears, result] = await Promise.all([
    membershipService.listAcademicYears(),
    membershipService.getMembershipsByUserId(user.id, {
      page: 1,
      pageSize: 100,
    }),
  ]);
  const currentAcademicYear = academicYears.find((year) => year.is_current);
  const currentYearMembership =
    result.data.find(
      (membership) => membership.academic_year_id === currentAcademicYear?.id,
    ) ?? null;
  const displayedMembership =
    currentYearMembership?.status === "active" ||
    currentYearMembership?.status === "suspended"
      ? currentYearMembership
      : null;
  const mayActivate =
    (!currentYearMembership ||
      ["expired", "cancelled"].includes(currentYearMembership.status));
  const blockedMessage =
    currentYearMembership?.status === "pending"
      ? "本學年度資格正在處理中，暫時無法再次啟用。"
      : currentYearMembership?.status === "suspended"
        ? "本學年度社員資格已停權，請聯絡幹部協助處理。"
      : undefined;

  return (
    <section className="container space-y-6 py-8">
      <PageHeader
        eyebrow="我的帳號"
        title="我的社員資格"
        description="查看目前資格與歷年社員紀錄；完成線下繳費後，可在此啟用新的學年度資格。"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <CurrentMembershipCard
            membership={displayedMembership}
            emptyMessage={blockedMessage}
          />
          <MembershipHistory memberships={result.data} />
        </div>

        <aside className="space-y-4">
          {mayActivate ? (
            <MembershipActivationForm />
          ) : (
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-(--text-primary)">
                社員資格啟用
              </h2>
              <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                {currentYearMembership?.status === "active"
                  ? "你已具備本學年度社員資格。"
                  : blockedMessage ?? "目前無法啟用新的社員資格。"}
              </p>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

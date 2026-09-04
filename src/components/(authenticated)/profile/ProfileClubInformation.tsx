import { MembershipStatusBadge } from "@/components/MembershipStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";

type ProfileClubInformationProps = {
  currentMembership: MembershipWithAcademicYear | null;
  hasMembershipHistory: boolean;
};

export function ProfileClubInformation({
  currentMembership,
  hasMembershipHistory,
}: ProfileClubInformationProps) {
  return (
    <section aria-labelledby="club-information-title">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="club-information-title"
            className="text-lg font-bold text-(--text-primary)"
          >
            社團資訊
          </h2>
          <ButtonLink
            href="/memberships"
            variant="text"
            size="sm"
            className="shrink-0"
          >
            查看社員資格
          </ButtonLink>
        </div>

        {currentMembership ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-(--text-primary)">
              {currentMembership.academic_year?.year ?? "本學年度"} 學年度
            </span>
            <span className="text-(--text-muted)">·</span>
            <span className="text-(--text-secondary)">
              {currentMembership.type === "lifetime" ? "終生社員" : "一般社員"}
            </span>
            <MembershipStatusBadge status={currentMembership.status} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-(--text-muted)">
            {hasMembershipHistory ? "本學年度尚未入社" : "目前沒有本學年度社員資格"}
          </p>
        )}
      </Card>
    </section>
  );
}

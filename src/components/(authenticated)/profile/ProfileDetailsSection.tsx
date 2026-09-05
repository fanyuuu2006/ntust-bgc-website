import { BadgeCheck, UserRound } from "lucide-react";
import type { HTMLAttributes } from "react";

import { MembershipStatusBadge } from "@/components/MembershipStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import type { UserProfile } from "@/types/database";
import { MEMBERSHIP_TYPE_LABEL } from "@/utils/membership";

type ProfileDetailsSectionProps = HTMLAttributes<HTMLElement> & {
  profile: UserProfile;
  currentMembership: MembershipWithAcademicYear | null;
  hasMembershipHistory: boolean;
};

type InfoField = {
  key: string;
  label: string;
  value: string | null;
};

function InfoField({ label, value }: Omit<InfoField, "key">) {
  const displayValue = value?.trim();

  return (
    <div className="min-w-0 border-b border-(--border-muted) py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-xs font-medium text-(--text-muted)">{label}</dt>
      <dd
        title={displayValue || undefined}
        className="mt-1 break-words text-sm font-semibold text-(--text-primary)"
      >
        {displayValue || "尚未填寫"}
      </dd>
    </div>
  );
}

export function ProfileDetailsSection({
  profile,
  currentMembership,
  hasMembershipHistory,
  className,
  ...rest
}: ProfileDetailsSectionProps) {
  const fields: InfoField[] = [
    { key: "real_name", label: "真實姓名", value: profile.real_name },
    { key: "phone", label: "聯絡電話", value: profile.phone },
    { key: "student_id", label: "學號", value: profile.student_id },
    { key: "school", label: "學校", value: profile.school },
    { key: "department", label: "系所", value: profile.department },
    { key: "grade", label: "年級", value: profile.grade },
  ];

  return (
    <section className={className} {...rest} aria-label="個人與社團資料">
      <Card className="p-4 sm:p-5">
        <section aria-labelledby="profile-info-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserRound
                aria-hidden="true"
                className="size-5 shrink-0 text-(--interactive-primary)"
              />
              <h2
                id="profile-info-title"
                className="text-lg font-bold text-(--text-primary)"
              >
                個人資料
              </h2>
            </div>
            <ButtonLink href="/settings" variant="outline" size="sm">
              編輯資料
            </ButtonLink>
          </div>

          <dl className="mt-3 grid min-w-0 grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
            {fields.map(({ key, ...field }) => (
              <InfoField key={key} {...field} />
            ))}
          </dl>
        </section>

        <section
          className="mt-5 border-t border-(--border-default) pt-5"
          aria-labelledby="club-information-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <BadgeCheck
                aria-hidden="true"
                className="size-5 shrink-0 text-(--status-info)"
              />
              <h2
                id="club-information-title"
                className="text-lg font-bold text-(--text-primary)"
              >
                社團資訊
              </h2>
            </div>
            <ButtonLink href="/memberships" variant="text" size="sm" className="px-0">
              查看社員資格
            </ButtonLink>
          </div>

          {currentMembership ? (
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl bg-(--surface-subtle) px-3 py-3 text-sm sm:px-4">
              <span className="font-semibold text-(--text-primary)">
                {currentMembership.academic_year?.year ?? "本學年度"} 學年度
              </span>
              <span aria-hidden="true" className="text-(--text-muted)">
                ·
              </span>
              <span className="text-(--text-secondary)">
                {MEMBERSHIP_TYPE_LABEL[currentMembership.type]}
              </span>
              <MembershipStatusBadge status={currentMembership.status} />
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-(--surface-subtle) px-3 py-3 text-sm text-(--text-muted) sm:px-4">
              {hasMembershipHistory
                ? "本學年度尚未入社"
                : "目前沒有本學年度社員資格"}
            </p>
          )}
        </section>
      </Card>
    </section>
  );
}

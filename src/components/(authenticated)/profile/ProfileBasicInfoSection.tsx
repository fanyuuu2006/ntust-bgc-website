import type { HTMLAttributes } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { UserProfile } from "@/types/database";

type ProfileBasicInfoSectionProps = HTMLAttributes<HTMLElement> & {
  profile: UserProfile;
};

type InfoFieldData = {
  key: string;
  label: string;
  value: string | null;
};

function InfoRow({ label, value }: Omit<InfoFieldData, "key">) {
  const displayValue = value?.trim();

  return (
    <div className="flex min-w-0 flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6">
      <span className="text-sm text-(--muted)">{label}</span>
      <span
        title={displayValue || undefined}
        className="break-words text-sm font-semibold text-(--foreground) sm:text-right"
      >
        {displayValue || "尚未填寫"}
      </span>
    </div>
  );
}

export function ProfileBasicInfoSection({
  profile,
  className,
  ...rest
}: ProfileBasicInfoSectionProps) {
  const contactFields: InfoFieldData[] = [
    { key: "phone", label: "聯絡電話", value: profile.phone },
  ];
  const academicFields: InfoFieldData[] = [
    { key: "student_id", label: "學號", value: profile.student_id },
    { key: "school", label: "學校", value: profile.school },
    { key: "department", label: "系所", value: profile.department },
    { key: "grade", label: "年級", value: profile.grade },
  ];

  return (
    <section className={className} {...rest} aria-labelledby="profile-info-title">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-(--border-default) pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="profile-info-title" className="text-lg font-bold text-(--foreground)">
            個人資料
          </h2>
          <ButtonLink
            href="/settings"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            編輯資料
          </ButtonLink>
        </div>
        <div className="grid gap-5 pt-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <h3 className="text-sm font-semibold text-(--text-primary)">聯絡資訊</h3>
            <div className="mt-2 divide-y divide-(--border-default)">
              {contactFields.map(({ key, ...field }) => (
                <InfoRow key={key} {...field} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-(--text-primary)">學籍資訊</h3>
            <div className="mt-2 divide-y divide-(--border-default)">
              {academicFields.map(({ key, ...field }) => (
                <InfoRow key={key} {...field} />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

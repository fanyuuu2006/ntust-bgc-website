import Link from "next/link";
import type { HTMLAttributes } from "react";
import { cn } from "@/utils/className";
import type { User, UserProfile } from "@/types/database";

type ProfileBasicInfoSectionProps = HTMLAttributes<HTMLElement> & {
  user: User;
  profile: UserProfile;
};

type InfoFieldData = {
  key: string;
  label: string;
  value: string | null;
};

type GroupAccent = "green" | "primary";

type InfoGroupData = {
  key: string;
  title: string;
  description: string;
  accent: GroupAccent;
  fields: readonly InfoFieldData[];
};

function InfoRow({ label, value }: InfoFieldData) {
  const displayValue = value?.trim();

  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
      <span className="text-sm text-(--muted)">{label}</span>
      <span
        title={displayValue || undefined}
        className="text-sm font-semibold text-(--foreground) sm:text-right"
      >
        {displayValue || "尚未填寫"}
      </span>
    </div>
  );
}

function InfoGroupCard({ title, description, accent, fields }: InfoGroupData) {
  return (
    <div
      className={cn(
        "card accent rounded-2xl p-4 sm:p-6",
        accent === "green" && "green",
      )}
    >
      <h3 className="text-base font-bold text-(--foreground)">{title}</h3>
      <p className="mt-1 text-sm text-(--muted)">{description}</p>

      <div className="mt-4 divide-y divide-(--border)">
        {fields.map(({ key, ...field }) => (
          <InfoRow key={key} {...field} />
        ))}
      </div>
    </div>
  );
}

export function ProfileBasicInfoSection({
  user,
  profile,
  className,
  ...rest
}: ProfileBasicInfoSectionProps) {
  const groups: InfoGroupData[] = [
    {
      key: "contact",
      title: "聯絡資訊",
      description: "用於借用桌遊與活動聯繫",
      accent: "green",
      fields: [
        { key: "real_name", label: "姓名", value: profile.real_name },
        { key: "email", label: "Email", value: user.email },
        { key: "phone", label: "手機號碼", value: profile.phone },
      ],
    },
    {
      key: "academic",
      title: "學籍資訊",
      description: "用於社團社員資料管理",
      accent: "primary",
      fields: [
        { key: "student_id", label: "學號", value: profile.student_id },
        { key: "school", label: "學校", value: profile.school },
        { key: "department", label: "系所", value: profile.department },
        { key: "grade", label: "年級", value: profile.grade },
      ],
    },
  ];

  return (
    <section
      className={className}
      {...rest}
      aria-labelledby="profile-info-title"
    >
      <div className="container">
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="profile-info-title"
            className="text-lg font-bold text-(--foreground) sm:text-xl"
          >
            基本資料
          </h2>
          <Link
            href="/settings"
            className="btn primary inline-flex w-full shrink-0 justify-center rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:w-auto"
          >
            編輯資料
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          {groups.map(({ key, ...group }) => (
            <InfoGroupCard key={key} {...group} />
          ))}
        </div>
      </div>
    </section>
  );
}

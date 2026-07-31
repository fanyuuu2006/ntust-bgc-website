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

const EMPTY_VALUE_LABEL = "尚未填寫";

const ACCENT_BAR_CLASS: Record<GroupAccent, string> = {
  green: "bg-(--game-green)",
  primary: "bg-(--primary)",
};

const ACCENT_CARD_CLASS: Record<GroupAccent, string> = {
  green: "green",
  primary: "",
};

function InfoRow({ label, value }: InfoFieldData) {
  const displayValue = value?.trim();

  if (!displayValue) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <span className="text-sm text-(--muted)">{label}</span>
        <span className="rounded-full bg-(--tertiary-background) px-2 py-0.5 text-xs text-(--muted)">
          {EMPTY_VALUE_LABEL}
        </span>
      </div>
    );
  }

  const valueClassName = "truncate text-sm font-semibold sm:text-base";

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="shrink-0 text-sm text-(--muted)">{label}</span>
      <span
        title={displayValue}
        className={cn(valueClassName, "text-(--foreground)")}
      >
        {displayValue}
      </span>
    </div>
  );
}

function InfoGroupCard({ title, description, accent, fields }: InfoGroupData) {
  const filledCount = fields.filter((field) => field.value?.trim()).length;
  const completion = Math.round((filledCount / fields.length) * 100);

  return (
    <div
      className={cn(
        "card accent rounded-2xl p-5 sm:p-6",
        ACCENT_CARD_CLASS[accent],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-(--foreground) sm:text-base">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-(--muted)">{description}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-(--muted)">
          {filledCount}/{fields.length}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={completion}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title}填寫進度`}
        className="mt-3 h-1 overflow-hidden rounded-full bg-(--tertiary-background)"
      >
        <div
          className={cn("h-full rounded-full", ACCENT_BAR_CLASS[accent])}
          style={{ width: `${completion}%` }}
        />
      </div>

      <div className="mt-1 divide-y divide-(--border)">
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
        {
          key: "email",
          label: "Email",
          value: user.email,
        },
        {
          key: "phone",
          label: "手機號碼",
          value: profile.phone,
        },
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

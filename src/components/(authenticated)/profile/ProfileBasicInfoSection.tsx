import Link from "next/link";
import type { UserProfileData } from "@/services/users/users.types";
import { cn } from "@/utils/className";

type ProfileBasicInfoSectionProps = React.HTMLAttributes<HTMLElement> & {
  data: UserProfileData;
};

type InfoFieldData = {
  label: string;
  value: string | null;
};

type InfoGroupData = {
  key: string;
  title: string;
  dotClassName: string;
  fields: readonly InfoFieldData[];
};

const EMPTY_VALUE_LABEL = "尚未填寫";

function InfoRow({ label, value }: InfoFieldData) {
  const displayValue = value?.trim();

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-(--muted)">{label}</dt>
      <dd
        className="min-w-0 text-right"
        title={displayValue || undefined}
      >
        {displayValue ? (
          <span className="block truncate text-sm font-semibold text-(--foreground) sm:text-base">
            {displayValue}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-(--tertiary-background) px-2.5 py-0.5 text-xs text-(--muted)">
            {EMPTY_VALUE_LABEL}
          </span>
        )}
      </dd>
    </div>
  );
}

function InfoGroup({
  title,
  dotClassName,
  fields,
}: Omit<InfoGroupData, "key">) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold text-(--foreground) sm:text-base">
        <span aria-hidden className={cn("size-2 rounded-full", dotClassName)} />
        {title}
      </h3>
      <dl className="mt-2 divide-y divide-(--border)">
        {fields.map((field) => (
          <InfoRow key={field.label} {...field} />
        ))}
      </dl>
    </div>
  );
}

export function ProfileBasicInfoSection({
  data,
  className,
  ...rest
}: ProfileBasicInfoSectionProps) {
  const { profile, email } = data;

  const groups: InfoGroupData[] = [
    {
      key: "contact",
      title: "聯絡資訊",
      dotClassName: "bg-(--game-green)",
      fields: [
        { label: "真實姓名", value: profile?.real_name ?? null },
        { label: "Email", value: email },
        { label: "手機號碼", value: profile?.phone ?? null },
      ],
    },
    {
      key: "academic",
      title: "學籍資訊",
      dotClassName: "bg-(--game-yellow)",
      fields: [
        { label: "學號", value: profile?.student_id ?? null },
        { label: "學校", value: profile?.school ?? null },
        { label: "系所", value: profile?.department ?? null },
        { label: "年級", value: profile?.grade ?? null },
      ],
    },
  ];

  return (
    <section className={className} {...rest}>
      <div className="container">
        <div className="card rounded-2xl p-6 sm:p-8" aria-label="基本資料">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-(--foreground) sm:text-xl">
              基本資料
            </h2>
            <Link
              href="/settings"
              className="btn primary inline-flex w-full justify-center rounded-xl px-4 py-2 text-sm sm:w-auto"
            >
              編輯個人資料
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-y-7 lg:grid-cols-2 lg:gap-x-12">
            {groups.map(({ key, ...group }) => (
              <InfoGroup key={key} {...group} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

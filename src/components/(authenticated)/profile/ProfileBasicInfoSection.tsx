import { cn } from "@/utils/className";
import { UserProfileData } from "@/services/users/users.types";

type ProfileBasicInfoSectionProps = React.HTMLAttributes<HTMLElement> & {
  data: UserProfileData;
};

type InfoFieldData = {
  label: string;
  value: string | null;
};

type InfoGroup = {
  key: string;
  title: string;
  dotClassName: string;
  fields: InfoFieldData[];
};

const EMPTY_VALUE_LABEL = "尚未填寫";

/* ------------------------------------------------------------------ */
/* Sub components                                                     */
/* ------------------------------------------------------------------ */

function InfoValue({ value }: { value: string | null }) {
  if (!value) {
    return (
      <span className="inline-flex w-fit items-center rounded-full bg-(--tertiary-background) px-2.5 py-0.5 text-xs text-(--muted)">
        {EMPTY_VALUE_LABEL}
      </span>
    );
  }
  return (
    <span className="truncate text-sm font-semibold text-(--foreground) sm:text-base">
      {value}
    </span>
  );
}

function InfoRow({ label, value }: InfoFieldData) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-(--muted)">{label}</dt>
      <dd className="min-w-0" title={value ?? undefined}>
        <InfoValue value={value} />
      </dd>
    </div>
  );
}

function InfoGroupDiv({ title, dotClassName, fields }: Omit<InfoGroup, "key">) {
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

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * 顯示使用者基本資料，依「聯絡資訊」與「學籍資訊」分組，
 * 每組以彩色圓點標示、資料列採左右對齊排版，
 * 提升資訊密度並與正式管理系統的視覺風格保持一致。
 */
export function ProfileBasicInfoSection({
  data,
  className,
  ...rest
}: ProfileBasicInfoSectionProps) {
  const { profile, email } = data;

  const groups: InfoGroup[] = [
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
          <h2 className="text-lg font-bold text-(--foreground) sm:text-xl">
            基本資料
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-6 sm:mt-6 sm:grid-cols-2">
            {groups.map(({ key, ...group }) => (
              <InfoGroupDiv key={key} {...group} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import type { User, UserProfile } from "@/types/database";

type ProfileBasicInfoProps = {
  user: User;
  profile: UserProfile | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * 基本資料以 <dl> 表示（label/value 語意明確），
 * 缺值一律顯示「尚未填寫」，不留空白造成版面跳動或語意不明。
 */
export function ProfileBasicInfo({ user, profile }: ProfileBasicInfoProps) {
  const items: { label: string; value: string | null | undefined }[] = [
    { label: "Email", value: user.email },
    { label: "電話", value: profile?.phone },
    { label: "學號", value: profile?.student_id },
    { label: "加入時間", value: formatDate(user.created_at) },
  ];

  return (
    <section className="card p-6" aria-labelledby="profile-basic-info-heading">
      <h2
        id="profile-basic-info-heading"
        className="mb-4 text-sm font-semibold text-(--muted)"
      >
        基本資料
      </h2>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-xs text-(--muted)">{label}</dt>
            <dd className="text-sm font-medium text-(--foreground)">
              {value || "尚未填寫"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

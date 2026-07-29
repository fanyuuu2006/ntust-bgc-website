import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar";
import { UserProfileData } from "@/services/users/users.types";
import { cn } from "@/utils/className";

type ProfileHeroSectionProps = React.HTMLAttributes<HTMLElement> & {
  data: UserProfileData;
};

/**
 * Badge 顏色只用來表達「狀態的語意」，不做裝飾性區分：
 * - green / yellow / red / muted：對應社員資格的實際狀態
 * - primary：幹部職位徽章統一使用，代表「幹部身分」本身，
 *   多筆職位（例如同時任美宣、攝影）不應該用不同顏色，
 *   否則會讓人誤以為顏色代表職位間的差異或高低。
 */
type BadgeVariant = "primary" | "green" | "yellow" | "red" | "muted";

const MEMBERSHIP_STATUS_CONFIG: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "社員審核中", variant: "yellow" },
  active: { label: "社員", variant: "green" },
  expired: { label: "社員資格已過期", variant: "muted" },
  suspended: { label: "社員已停權", variant: "red" },
  cancelled: { label: "社員資格已取消", variant: "muted" },
};

const BADGE_VARIANT_CLASS: Record<BadgeVariant, string> = {
  primary: "border-(--primary) text-(--primary)",
  green: "border-(--game-green) text-(--game-green)",
  yellow: "border-(--game-yellow) text-(--foreground)",
  red: "border-(--game-red) text-(--game-red)",
  muted: "border-(--border) text-(--muted)",
};

export function ProfileHeroSection({
  data: { profile, recentMemberships, recentOfficerPositions, ...user },
  ...rest
}: ProfileHeroSectionProps) {
  // 用 is_current 明確找出「目前學年度」的社員紀錄，
  // 不能直接假設 recentMemberships[0] 就是目前學年度
  // （例如今年還沒繳費，最近一筆會是去年的）。
  const currentMembership = recentMemberships.find(
    (membership) => membership.academic_year.is_current,
  );
  const membershipConfig = currentMembership
    ? MEMBERSHIP_STATUS_CONFIG[currentMembership.status]
    : undefined;

  const metaItems = [
    profile?.school,
    profile?.department,
    profile?.grade,
  ].filter((item): item is string => Boolean(item));

  const badges: { key: string; label: string; variant: BadgeVariant }[] = [
    {
      key: "membership",
      label: membershipConfig?.label ?? "非社員",
      variant: membershipConfig?.variant ?? "muted",
    },
    ...recentOfficerPositions.map((officer) => ({
      key: officer.id,
      label: `${officer.academic_year.year}・${officer.title}`,
      variant: "primary" as const,
    })),
  ];

  return (
    <section {...rest}>
      <div className="container">
        <div
          className="card rounded-2xl flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
          aria-label="個人身分資訊"
        >
          <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
            {/* Avatar */}
            <div className="size-20 shrink-0 overflow-hidden rounded-2xl border border-(--border) sm:size-24 md:size-28">
              <UserAvatar user={user} className="h-full w-full object-cover" />
            </div>

            {/* Identity */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold leading-tight text-(--foreground) sm:text-3xl">
                  {user.name}
                </h1>

                {profile?.real_name && (
                  <p className="text-sm text-(--muted) sm:text-base">
                    {profile.real_name}
                  </p>
                )}

                {metaItems.length > 0 && (
                  <p className="truncate text-xs text-(--muted) sm:text-sm">
                    {metaItems.join(" · ")}
                  </p>
                )}
              </div>

              {badges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {badges.map((badge) => (
                    <span
                      key={badge.key}
                      className={cn(
                        "whitespace-nowrap rounded-full border bg-(--secondary-background) px-2.5 py-1 text-xs font-medium",
                        BADGE_VARIANT_CLASS[badge.variant],
                      )}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link
            href="/settings"
            className="btn primary w-full shrink-0 rounded-xl px-4 py-2 text-center text-sm sm:w-auto sm:self-start"
          >
            編輯個人資料
          </Link>
        </div>
      </div>
    </section>
  );
}

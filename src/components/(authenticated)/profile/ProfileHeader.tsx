import { UserAvatar } from "@/components/UserAvatar";
import { UserProfileData } from "@/services/users/users.types";
import { cn } from "@/utils/className";

type ProfileHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  data: UserProfileData;
};

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

/**
 * Profile 頁面的身分識別區塊。
 *
 * 只負責回答「這個人是誰」：頭像、姓名、身分徽章。
 * Email、學號、加入日期等細節資料交由 ProfileBasicInfo / MembershipCard /
 * OfficerPositionsCard 呈現，避免同一筆資料在頁面中重複出現。
 */
export function ProfileHeader({
  data: { profile, membership, officerPositions, ...user },
  className,
  ...rest
}: ProfileHeaderProps) {
  const membershipConfig = membership
    ? MEMBERSHIP_STATUS_CONFIG[membership.status]
    : null;

  const badges: { key: string; label: string; variant: BadgeVariant }[] = [
    {
      key: "membership",
      label: membershipConfig?.label ?? "非社員",
      variant: membershipConfig?.variant ?? "muted",
    },
    ...officerPositions.map((officer) => ({
      key: officer.id,
      label: `${officer.academic_year.year} 學年度・${officer.title}`,
      variant: "primary" as const,
    })),
  ];

  return (
    <div
      className={cn(
        "card rounded-2xl flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:gap-6 sm:text-left",
        className,
      )}
      aria-label="個人身分資訊"
      {...rest}
    >
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
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {badges.map((badge) => (
              <span
                key={badge.key}
                className={cn(
                  "rounded-full border bg-(--secondary-background) px-2.5 py-1 text-xs font-medium",
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
  );
}

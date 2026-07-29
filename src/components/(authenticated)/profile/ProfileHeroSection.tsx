import { UserAvatar } from "@/components/UserAvatar";
import type { UserProfileData } from "@/services/users/users.types";
import type { MembershipStatus } from "@/types/database";
import { cn } from "@/utils/className";

type ProfileHeroSectionProps = React.HTMLAttributes<HTMLElement> & {
  data: UserProfileData;
};

type BadgeVariant = "primary" | "green" | "yellow" | "red" | "muted";

type BadgeData = {
  key: string;
  label: string;
  variant: BadgeVariant;
};

const BADGE_VARIANT_CLASS: Record<BadgeVariant, string> = {
  primary: "border-(--primary) text-(--primary)",
  green: "border-(--game-green) text-(--game-green)",
  yellow: "border-(--game-yellow) text-(--foreground)",
  red: "border-(--game-red) text-(--game-red)",
  muted: "border-(--border) text-(--muted)",
};

function Badge({ label, variant }: Omit<BadgeData, "key">) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full border bg-(--secondary-background) px-3 py-1 text-xs font-medium",
        BADGE_VARIANT_CLASS[variant],
      )}
    >
      {label}
    </span>
  );
}

const MEMBERSHIP_STATUS_CONFIG: Record<
  MembershipStatus,
  Omit<BadgeData, "key">
> = {
  pending: { label: "社員審核中", variant: "yellow" },
  active: { label: "社員", variant: "green" },
  expired: { label: "社員資格已過期", variant: "muted" },
  suspended: { label: "社員已停權", variant: "red" },
  cancelled: { label: "社員資格已取消", variant: "muted" },
};

export function ProfileHeroSection({
  data: { profile, recentMemberships, recentOfficerPositions, ...user },
  ...rest
}: ProfileHeroSectionProps) {
  const currentMembership = recentMemberships.find(
    (membership) => membership.academic_year.is_current,
  );
  const membershipBadge = currentMembership
    ? {
        key: currentMembership.id,
        ...MEMBERSHIP_STATUS_CONFIG[currentMembership.status],
      }
    : null;

  const metaText = [profile?.school, profile?.department, profile?.grade]
    .filter((item): item is string => Boolean(item))
    .join(" · ");

  const badges: BadgeData[] = [
    ...(membershipBadge ? [membershipBadge] : []),
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
          className="card flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8"
          aria-label="個人身分資訊"
        >
          <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl border border-(--border) sm:size-28 md:size-32">
              <UserAvatar user={user} className="h-full w-full object-cover" />
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="space-y-1">
                <h1 className="text-2xl leading-tight font-bold text-(--foreground) sm:text-3xl">
                  {user.name}
                </h1>

                {profile?.real_name && (
                  <p className="text-sm text-(--muted) sm:text-base">
                    {profile.real_name}
                  </p>
                )}

                {metaText && (
                  <p
                    className="truncate text-xs text-(--muted) sm:text-sm"
                    title={metaText}
                  >
                    {metaText}
                  </p>
                )}
              </div>

              {badges.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {badges.map(({ key, ...badge }) => (
                    <Badge key={key} {...badge} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

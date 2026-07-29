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
  primary: "border-(--primary) bg-(--secondary-background) text-(--primary)",
  green: "border-(--game-green) bg-(--secondary-background) text-(--game-green)",
  yellow: "border-(--game-yellow) bg-(--secondary-background) text-(--foreground)",
  red: "border-(--game-red) bg-(--secondary-background) text-(--game-red)",
  muted: "border-(--border) bg-(--secondary-background) text-(--muted)",
};

const MEMBERSHIP_STATUS_CONFIG: Record<
  MembershipStatus,
  Omit<BadgeData, "key">
> = {
  pending: { label: "會員資格審核中", variant: "yellow" },
  active: { label: "有效會員", variant: "green" },
  expired: { label: "會員資格已到期", variant: "muted" },
  suspended: { label: "會員資格已停權", variant: "red" },
  cancelled: { label: "會員資格已取消", variant: "muted" },
};

function Badge({ label, variant }: Omit<BadgeData, "key">) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
        BADGE_VARIANT_CLASS[variant],
      )}
    >
      {label}
    </span>
  );
}

export function ProfileHeroSection({
  data: { profile, recentMemberships, recentOfficerPositions, ...user },
  className,
  ...rest
}: ProfileHeroSectionProps) {
  const currentMembership = recentMemberships.find(
    (membership) => membership.academic_year.is_current,
  );
  const membershipBadge = currentMembership
    ? { key: currentMembership.id, ...MEMBERSHIP_STATUS_CONFIG[currentMembership.status] }
    : null;
  const metaText = [profile?.school, profile?.department, profile?.grade]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
  const badges: BadgeData[] = [
    ...(membershipBadge ? [membershipBadge] : []),
    ...recentOfficerPositions.map((officer) => ({
      key: officer.id,
      label: `${officer.academic_year.year}｜${officer.title}`,
      variant: "primary" as const,
    })),
  ];

  return (
    <section className={className} {...rest} aria-labelledby="profile-title">
      <div className="card relative overflow-hidden rounded-2xl p-5 sm:p-7 lg:p-8">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--primary) via-(--game-blue) to-(--game-green)"
        />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-(--primary-background) shadow-[0_0_0_1px_var(--border)] sm:size-28">
              <UserAvatar user={user} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 id="profile-title" className="truncate text-2xl font-bold text-(--foreground) sm:text-3xl">
                {user.name}
              </h1>
              {profile?.real_name && profile.real_name !== user.name && (
                <p className="mt-1 text-sm text-(--muted)">{profile.real_name}</p>
              )}
              <p className="mt-2 truncate text-sm text-(--muted)" title={user.email}>
                {user.email}
              </p>
              {metaText && <p className="mt-1 truncate text-sm text-(--muted)" title={metaText}>{metaText}</p>}
              {badges.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {badges.map(({ key, ...badge }) => <Badge key={key} {...badge} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { UserAvatar } from "@/components/UserAvatar";
import { ButtonLink } from "@/components/ui/Button";
import { ProfileIdentityBadges } from "./ProfileIdentityBadges";
import type { ProfileIdentityBadge } from "@/services/profile/profile.service";
import type { User, UserProfile } from "@/types/database";

type ProfileHeroSectionProps = React.HTMLAttributes<HTMLElement> & {
  user: User;
  profile: UserProfile;
  identityBadges: ProfileIdentityBadge[];
};

export function ProfileHeroSection({
  user,
  profile,
  identityBadges,
  className,
  ...rest
}: ProfileHeroSectionProps) {
  return (
    <section className={className} {...rest} aria-labelledby="profile-title">
      <div
        className="card relative overflow-hidden rounded-2xl p-5 sm:p-7 lg:p-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 5%, transparent), transparent 45%), linear-gradient(315deg, color-mix(in oklab, var(--status-success) 4%, transparent), transparent 38%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--primary) via-(--game-blue) to-(--game-green)"
        />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-(--border) sm:size-28">
              <UserAvatar user={user} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1
                id="profile-title"
                className="break-words text-2xl font-bold text-(--foreground) sm:text-3xl"
              >
                {user.name}
              </h1>
              <p className="mt-1 break-words text-base font-medium text-(--text-secondary)">
                {profile.real_name || "尚未填寫"}
              </p>
              <p className="mt-2 break-all text-sm text-(--muted)" title={user.email}>
                {user.email}
              </p>
              <ProfileIdentityBadges badges={identityBadges} />
            </div>
          </div>
          <ButtonLink
            href="/settings"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            編輯資料
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

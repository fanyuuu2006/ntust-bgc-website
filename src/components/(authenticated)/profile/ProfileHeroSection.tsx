import { ProfileHeroSurface } from "@/components/profile/ProfileHeroSurface";
import { UserAvatar } from "@/components/UserAvatar";
import type { ReactNode } from "react";
import { ProfileIdentityBadges } from "./ProfileIdentityBadges";
import type { ProfileIdentityBadge } from "@/services/profile/profile.service";
import type { PublicUserIdentity } from "@/types/public-user";

type ProfileHeroSectionProps = React.HTMLAttributes<HTMLElement> & {
  user: PublicUserIdentity;
  details?: ReactNode;
  actions?: ReactNode;
  identityBadges: ProfileIdentityBadge[];
};

export function ProfileHeroSection({
  user,
  details,
  actions,
  identityBadges,
  className,
  ...rest
}: ProfileHeroSectionProps) {
  return (
    <section className={className} {...rest} aria-labelledby="profile-title">
      <ProfileHeroSurface>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-(--border) sm:size-28">
              <UserAvatar user={user} className="h-full w-full" />
            </div>
            <div className="min-w-0">
              <h1
                id="profile-title"
                className="wrap-break-word text-2xl font-bold text-(--foreground) sm:text-3xl"
              >
                {user.name}
              </h1>
              {details}
              <ProfileIdentityBadges badges={identityBadges} />
            </div>
          </div>
          {actions}

        </div>
      </ProfileHeroSurface>
    </section>
  );
}

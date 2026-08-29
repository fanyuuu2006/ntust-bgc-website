import { UserAvatar } from "@/components/UserAvatar";
import { MembershipStatusBadge } from "@/components/(authenticated)/memberships/MembershipStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";
import { OfficerPositionWithAcademicYear } from "@/services/officer-positions/officer-positions.types";
import type { User, UserProfile } from "@/types/database";

type ProfileHeroSectionProps = React.HTMLAttributes<HTMLElement> & {
  user: User;
  profile: UserProfile;
  currentMembership: MembershipWithAcademicYear | null;
  currentOfficerPositions: OfficerPositionWithAcademicYear[];
};


export function ProfileHeroSection({
  user,
  profile,
  currentMembership,
  currentOfficerPositions,
  className,
  ...rest
}: ProfileHeroSectionProps) {
  const metaText = [profile.school, profile.department, profile.grade]
    .filter((item): item is string => Boolean(item))
    .join(" · ");


  return (
    <section className={className} {...rest} aria-labelledby="profile-title">
      <div className="container">
        <div className="card relative overflow-hidden rounded-2xl p-5 sm:p-7 lg:p-8">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--primary) via-(--game-blue) to-(--game-green)"
          />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-(--border) sm:size-28">
                <UserAvatar
                  user={user}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h1
                  id="profile-title"
                  className="truncate text-2xl font-bold text-(--foreground) sm:text-3xl"
                >
                  {user.name}
                </h1>
                {profile.real_name && profile.real_name !== user.name && (
                  <p className="mt-1 text-sm text-(--muted)">
                    {profile.real_name}
                  </p>
                )}
                <p
                  className="mt-2 truncate text-sm text-(--muted)"
                  title={user.email}
                >
                  {user.email}
                </p>
                {metaText && (
                  <p
                    className="mt-1 truncate text-sm text-(--muted)"
                    title={metaText}
                  >
                    {metaText}
                  </p>
                )}
                {(currentMembership || currentOfficerPositions.length > 0) && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {currentMembership ? <MembershipStatusBadge status={currentMembership.status} /> : null}
                    {currentOfficerPositions.map((officer) => <Badge key={officer.id} tone="info">{officer.academic_year ? `${officer.academic_year.year} | ${officer.title}` : officer.title}</Badge>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

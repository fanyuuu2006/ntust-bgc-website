import { UserAvatar } from "@/components/UserAvatar";
import { UserProfileData } from "@/services/users/users.types";
import { cn } from "@/utils/className";

type ProfileHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  data: UserProfileData;
};

const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  pending: "社員審核中",
  active: "社員",
  expired: "社員資格已過期",
  suspended: "社員已停權",
  cancelled: "社員資格已取消",
};

export function ProfileHeader({
  data: { profile, membership, officerPositions, ...user },
  className,
  ...rest
}: ProfileHeaderProps) {
  const statusLabel = membership
    ? MEMBERSHIP_STATUS_LABEL[membership.status]
    : "非社員";

  const badges = [
    {
      label: statusLabel,
      visible: true,
    },
    membership && {
      label: `${membership.academic_year.year} 學年度`,
      visible: true,
    },
    ...officerPositions.map((officer) => ({
      label: officer.title,
      visible: true,
    })),
  ].filter(Boolean);

  return (
    <section
      className={cn(
        "grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] items-start gap-6 md:gap-8 px-2 py-4",
        className,
      )}
      {...rest}
    >
      {/* Avatar */}
      <div
        className="
          card
          overflow-hidden
          rounded-2xl
          shrink-0
          mx-auto
          md:mx-0
          size-40
          sm:size-48
          md:size-56
          lg:size-60
          transition-all
          duration-300
        "
      >
        <UserAvatar user={user} className="h-full w-full object-cover" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-col gap-5 text-center md:text-left">
        {/* Name */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            {user.name}
          </h1>

          {profile?.real_name && (
            <p className="text-lg text-(--muted)">{profile.real_name}</p>
          )}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {badges.map(
              (badge) =>
                badge?.visible && (
                  <span
                    key={badge.label}
                    className="
                      card
                      primary
                      rounded-full
                      px-3
                      py-1
                      text-sm
                      font-medium
                    "
                  >
                    {badge.label}
                  </span>
                ),
            )}
          </div>
        )}

        {/* Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoItem label="Email" value={user.email} />

          {profile?.student_id && (
            <InfoItem label="學號" value={profile.student_id} />
          )}

          {profile?.real_name && (
            <InfoItem label="真實姓名" value={profile.real_name} />
          )}

          {membership && (
            <InfoItem
              label="加入社員"
              value={new Date(membership.joined_at).toLocaleDateString("zh-TW")}
            />
          )}
        </div>

        {/* Action */}
        {/*
        <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
          <button className="btn primary">
            編輯個人資料
          </button>

          <button className="btn secondary">
            社員證
          </button>
        </div>
        */}
      </div>
    </section>
  );
}

type InfoItemProps = {
  label: string;
  value: React.ReactNode;
};

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-(--muted)">
        {label}
      </span>

      <span className="text-base font-medium break-all">{value}</span>
    </div>
  );
}

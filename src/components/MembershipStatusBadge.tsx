import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { MembershipStatus } from "@/types/database";
import { MEMBERSHIP_STATUS_LABEL } from "@/utils/membership";

const statusTone: Record<MembershipStatus, BadgeTone> = {
  pending: "warning",
  active: "success",
  expired: "neutral",
  suspended: "danger",
  cancelled: "neutral",
};

export { MEMBERSHIP_STATUS_LABEL };

export function MembershipStatusBadge({
  status,
  className,
}: {
  status: MembershipStatus;
  className?: string;
}) {
  return (
    <Badge tone={statusTone[status]} className={className}>
      {MEMBERSHIP_STATUS_LABEL[status]}
    </Badge>
  );
}

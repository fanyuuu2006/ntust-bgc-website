import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { MembershipStatus } from "@/types/database";

const MEMBERSHIP_STATUS: Record<
  MembershipStatus,
  { label: string; tone: BadgeTone }
> = {
  pending: { label: "待啟用", tone: "warning" },
  active: { label: "有效", tone: "success" },
  expired: { label: "已過期", tone: "neutral" },
  suspended: { label: "已停權", tone: "danger" },
  cancelled: { label: "已取消", tone: "neutral" },
};

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  pending: MEMBERSHIP_STATUS.pending.label,
  active: MEMBERSHIP_STATUS.active.label,
  expired: MEMBERSHIP_STATUS.expired.label,
  suspended: MEMBERSHIP_STATUS.suspended.label,
  cancelled: MEMBERSHIP_STATUS.cancelled.label,
};

export function MembershipStatusBadge({ status, className }: { status: MembershipStatus; className?: string }) {
  const { label, tone } = MEMBERSHIP_STATUS[status];
  return <Badge tone={tone} className={className}>{label}</Badge>;
}

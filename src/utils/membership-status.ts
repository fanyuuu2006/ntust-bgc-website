import type { MembershipStatus } from "@/types/database";

const MEMBERSHIP_STATUS_TRANSITIONS: Record<
  MembershipStatus,
  readonly MembershipStatus[]
> = {
  pending: ["active", "cancelled"],
  active: ["suspended", "cancelled", "expired"],
  suspended: ["active", "cancelled"],
  expired: [],
  cancelled: [],
};

export function canTransitionMembershipStatus(
  from: MembershipStatus,
  to: MembershipStatus,
) {
  return from === to || MEMBERSHIP_STATUS_TRANSITIONS[from].includes(to);
}

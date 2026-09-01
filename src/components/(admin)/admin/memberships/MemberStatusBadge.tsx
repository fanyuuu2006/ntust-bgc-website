export {
  MembershipStatusBadge as MemberStatusBadge,
  MEMBERSHIP_STATUS_LABEL,
} from "@/components/MembershipStatusBadge";

export function MembershipTypeLabel({ type }: { type: "annual" | "lifetime" }) {
  return type === "annual" ? "一般社員" : "終生社員";
}

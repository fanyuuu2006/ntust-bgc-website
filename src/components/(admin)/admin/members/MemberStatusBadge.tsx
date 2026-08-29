export {
  MembershipStatusBadge as MemberStatusBadge,
  MEMBERSHIP_STATUS_LABEL,
} from "@/components/MembershipStatusBadge";

export function MembershipTypeLabel({ type }: { type: "annual" | "lifetime" }) {
  return type === "annual" ? "年度社員" : "永久社員";
}

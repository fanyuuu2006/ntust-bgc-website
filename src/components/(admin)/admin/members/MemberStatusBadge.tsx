import type { MembershipStatus, MembershipType } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
const config: Record<MembershipStatus, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" }> = { pending: { label: "待啟用", tone: "warning" }, active: { label: "有效", tone: "success" }, expired: { label: "已過期", tone: "neutral" }, suspended: { label: "已停權", tone: "danger" }, cancelled: { label: "已取消", tone: "neutral" } };
export function MemberStatusBadge({ status }: { status: MembershipStatus }) { return <Badge tone={config[status].tone}>{config[status].label}</Badge>; }
export function MembershipTypeLabel({ type }: { type: MembershipType }) { return type === "annual" ? "年度社員" : "永久社員"; }

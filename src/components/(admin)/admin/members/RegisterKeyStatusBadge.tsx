import type { MembershipRegisterKeyStatus } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
const config: Record<MembershipRegisterKeyStatus, { label: string; tone: "success" | "info" | "danger" | "neutral" }> = { available: { label: "可使用", tone: "success" }, claimed: { label: "已領取", tone: "info" }, revoked: { label: "已撤銷", tone: "danger" }, expired: { label: "已過期", tone: "neutral" } };
export function RegisterKeyStatusBadge({ status }: { status: MembershipRegisterKeyStatus }) { return <Badge tone={config[status].tone}>{config[status].label}</Badge>; }

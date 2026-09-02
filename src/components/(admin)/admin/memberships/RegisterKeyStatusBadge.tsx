import { Badge } from "@/components/ui/Badge";
import type { MembershipRegisterKeyStatus } from "@/types/database";

const statusConfig: Record<
  MembershipRegisterKeyStatus,
  { label: string; tone: "success" | "info" | "danger" | "neutral" }
> = {
  available: { label: "可使用", tone: "success" },
  claimed: { label: "已使用", tone: "info" },
  revoked: { label: "已撤銷", tone: "danger" },
  expired: { label: "已過期", tone: "neutral" },
};

export function RegisterKeyStatusBadge({
  status,
}: {
  status: MembershipRegisterKeyStatus;
}) {
  const config = statusConfig[status];

  return <Badge tone={config.tone}>{config.label}</Badge>;
}

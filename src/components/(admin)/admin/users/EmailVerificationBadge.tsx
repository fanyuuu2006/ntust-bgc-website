import { Badge } from "@/components/ui/Badge";

export function EmailVerificationBadge({
  verifiedAt,
  closedAt,
}: {
  verifiedAt: string | null;
  closedAt?: string | null;
}) {
  if (closedAt) return <Badge tone="neutral">已註銷</Badge>;
  return (
    <Badge tone={verifiedAt ? "success" : "neutral"}>
      {verifiedAt ? "已驗證" : "尚未驗證"}
    </Badge>
  );
}

import { Badge } from "@/components/ui/Badge";

export function EmailVerificationBadge({
  verifiedAt,
}: {
  verifiedAt: string | null;
}) {
  return (
    <Badge tone={verifiedAt ? "success" : "neutral"}>
      {verifiedAt ? "已驗證" : "尚未驗證"}
    </Badge>
  );
}

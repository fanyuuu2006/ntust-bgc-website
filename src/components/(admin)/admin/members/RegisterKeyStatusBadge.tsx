import type { MembershipRegisterKeyStatus } from "@/types/database";
import { cn } from "@/utils/className";

const statusMap: Record<
  MembershipRegisterKeyStatus,
  { label: string; className: string }
> = {
  available: {
    label: "可使用",
    className: "bg-(--game-green)/10 text-(--game-green)",
  },
  claimed: {
    label: "已啟用",
    className: "bg-(--primary)/10 text-(--primary)",
  },
  revoked: {
    label: "已作廢",
    className: "bg-(--game-red)/10 text-(--game-red)",
  },
  expired: {
    label: "已過期",
    className: "bg-(--secondary)/10 text-(--secondary)",
  },
};

export function RegisterKeyStatusBadge({
  status,
}: {
  status: MembershipRegisterKeyStatus;
}) {
  const config = statusMap[status];

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

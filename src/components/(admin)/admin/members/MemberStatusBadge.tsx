import type { MembershipStatus, MembershipType } from "@/types/database";
import { cn } from "@/utils/className";

const statusMap: Record<MembershipStatus, { label: string; className: string }> =
  {
    pending: {
      label: "處理中",
      className: "bg-(--game-yellow)/15 text-(--game-yellow)",
    },
    active: {
      label: "有效",
      className: "bg-(--game-green)/10 text-(--game-green)",
    },
    expired: {
      label: "已過期",
      className: "bg-(--secondary)/10 text-(--secondary)",
    },
    suspended: {
      label: "已停權",
      className: "bg-(--game-red)/10 text-(--game-red)",
    },
    cancelled: {
      label: "已取消",
      className: "bg-(--secondary)/10 text-(--muted)",
    },
  };

const typeMap: Record<MembershipType, string> = {
  annual: "一般社員",
  lifetime: "永久社員",
};

export function MemberStatusBadge({ status }: { status: MembershipStatus }) {
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

export function MembershipTypeLabel({ type }: { type: MembershipType }) {
  return typeMap[type];
}

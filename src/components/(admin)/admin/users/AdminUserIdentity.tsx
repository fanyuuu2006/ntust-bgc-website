import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils/className";

export type AdminIdentity = {
  name: string;
  email: string;
  closed_at: string | null;
  real_name: string | null;
  student_id: string | null;
};

type AdminUserIdentityProps = {
  identity: AdminIdentity;
  disambiguation?: "studentId" | "email";
  variant?: "table" | "mobile" | "detail";
  className?: string;
};

export function AdminUserIdentity({
  identity,
  disambiguation,
  variant = "table",
  className,
}: AdminUserIdentityProps) {
  const realName = identity.real_name?.trim() || null;
  const primary = realName ?? identity.name;
  const secondary = realName ? identity.name : "未填寫真實姓名";
  const detail = disambiguation === "studentId"
    ? identity.student_id
    : disambiguation === "email"
      ? identity.email
      : null;
  const boundedText = variant === "detail"
    ? "wrap-anywhere"
    : variant === "mobile"
      ? "line-clamp-2 wrap-anywhere"
      : "truncate";

  return (
    <div className={cn("min-w-0 max-w-full", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <p className={cn("min-w-0 font-semibold", boundedText)} title={primary}>
          {primary}
        </p>
        {identity.closed_at ? <Badge tone="neutral">帳號已關閉</Badge> : null}
      </div>
      <p
        className={cn("min-w-0 text-xs text-(--text-muted)", boundedText)}
        title={realName ? identity.name : undefined}
      >
        {secondary}
      </p>
      {detail ? (
        <p className={cn("min-w-0 text-xs text-(--text-secondary)", boundedText)} title={detail}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

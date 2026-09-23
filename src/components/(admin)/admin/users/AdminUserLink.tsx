import Link from "next/link";

import { buildAdminReturnHref } from "@/utils/admin-return";
import { cn } from "@/utils/className";
import { AdminUserIdentity, type AdminIdentity } from "./AdminUserIdentity";

type AdminUserLinkProps = {
  userId: string;
  identity: AdminIdentity;
  returnTo?: string;
  disambiguation?: "studentId" | "email";
  variant?: "table" | "mobile" | "detail";
  className?: string;
};

export function AdminUserLink({ userId, identity, returnTo, disambiguation, variant, className }: AdminUserLinkProps) {
  const destination = `/admin/users/${userId}`;

  return (
    <Link
      href={returnTo ? buildAdminReturnHref(destination, returnTo, "/admin/users") : destination}
      className={cn(
        "block min-w-0 rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)",
        className,
      )}
    >
      <AdminUserIdentity identity={identity} disambiguation={disambiguation} variant={variant} />
    </Link>
  );
}

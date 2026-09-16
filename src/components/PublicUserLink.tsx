import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar";
import type { PublicUserIdentity } from "@/types/public-user";

/** 作者連結只接收 Service 的公開投影，不接收完整 User／Profile 或執行身份查詢。 */
export function PublicUserLink({ identity }: { identity: PublicUserIdentity }) {
  return (
    <Link href={`/profile/${identity.id}`} className="inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-md text-sm text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
      <UserAvatar user={identity} className="size-8 shrink-0 rounded-full" />
      <span className="min-w-0 wrap-anywhere">{identity.name}</span>
    </Link>
  );
}

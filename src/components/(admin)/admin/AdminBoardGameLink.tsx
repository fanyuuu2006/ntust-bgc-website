import Link from "next/link";

import { buildAdminReturnHref } from "@/utils/admin-return";
import { cn } from "@/utils/className";

type AdminBoardGameLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  boardGameId: string;
  returnTo?: string;
};

export function AdminBoardGameLink({ boardGameId, returnTo, className, ...props }: AdminBoardGameLinkProps) {
  const destination = `/admin/board-games/${boardGameId}/edit`;

  return (
    <Link
      href={returnTo ? buildAdminReturnHref(destination, returnTo, "/admin/board-games") : destination}
      className={cn(
        "wrap-anywhere font-medium text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)",
        className,
      )}
      {...props}
    />
  );
}

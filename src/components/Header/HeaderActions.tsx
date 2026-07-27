"use client";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/utils/className";
import Link from "next/link";
import { UserMenu } from "./UserMenu";

type HeaderActionsProps = React.HTMLAttributes<HTMLDivElement>;

export const HeaderActions = ({ className, ...rest }: HeaderActionsProps) => {
  const { user } = useUser();

  return (
    <div className={cn("shrink-0 flex items-center gap-2", className)} {...rest}>
      {user ? (
        <UserMenu user={user} />
      ) : (
        <Link href="/login" className="btn primary py-1.5 px-4 rounded-full">
          登入
        </Link>
      )}
    </div>
  );
};

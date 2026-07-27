"use client";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/utils/className";
import Link from "next/link";
import { LogoutButton } from "../LogoutButton";

type HeaderActionsProps = React.HTMLAttributes<HTMLDivElement>;
export const HeaderActions = ({ className, ...rest }: HeaderActionsProps) => {
  const { user } = useUser();

  return (
    <div className={cn("flex items-center gap-2", className)} {...rest}>
      {user ? (
        <LogoutButton>登出</LogoutButton>
      ) : (
        <Link href="/login">登入</Link>
      )}
    </div>
  );
};

import { cn } from "@/utils/className";
import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { User } from "@/types/database";

type HeaderActionsProps = React.HTMLAttributes<HTMLDivElement> & {
  user: User | null;
  isAdmin: boolean;
};

export const HeaderActions = ({
  className,
  user,
  isAdmin,
  ...rest
}: HeaderActionsProps) => {
  return (
    <div
      className={cn("shrink-0 flex items-center gap-2", className)}
      {...rest}
    >
      {user ? (
        <UserMenu user={user} isAdmin={isAdmin} />
      ) : (
        <Link href="/login" className="btn primary py-1.5 px-4 rounded-full">
          登入
        </Link>
      )}
    </div>
  );
};

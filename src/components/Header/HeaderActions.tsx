import { cn } from "@/utils/className";
import { UserMenu } from "./UserMenu";
import { User } from "@/types/database";
import { ButtonLink } from "@/components/ui/Button";

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
        <ButtonLink href="/login" variant="primary" size="sm">
          登入
        </ButtonLink>
      )}
    </div>
  );
};

import { UserAvatar } from "@/components/UserAvatar";
import { siteConfigs } from "@/libs/siteConfigs";
import { cn } from "@/utils/className";
import type { User } from "@/types/database";

type DashboardWelcomeProps = React.HTMLAttributes<HTMLDivElement> & {
  user: User;
};

export function DashboardWelcome({
  user,
  className,
  ...rest
}: DashboardWelcomeProps) {
  return (
    <div
      className={cn(
        "card rounded-xl flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-8",
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <UserAvatar
          user={user}
          className="size-14 rounded-lg shrink-0 sm:h-16 sm:w-16"
        />

        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-bold text-(--foreground) sm:text-2xl">
            您好，{user.name}
          </h1>

          <p className="text-sm text-(--muted)">
            歡迎回到{" "}
            <span className="font-medium text-(--foreground)">
              {siteConfigs.name}
            </span>
          </p>

          <p className="text-xs text-(--muted) sm:text-sm">
            在這裡查看您的桌遊借用紀錄與社課參與狀況
          </p>
        </div>
      </div>
    </div>
  );
}

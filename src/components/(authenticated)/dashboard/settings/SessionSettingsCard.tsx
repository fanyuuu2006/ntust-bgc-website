import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";
import { SettingsCard } from "./SettingsCard";
import { SessionList } from "./SessionList";
import type { UUID } from "@/types/database";

type SessionSettingsCardProps = React.HTMLAttributes<HTMLDivElement> & {
  userId: UUID;
};

export const SessionSettingsCard = async ({
  userId,
  ...rest
}: SessionSettingsCardProps) => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? "";
  const sessions = await authService.listSessions(userId, token);

  return (
    <SettingsCard
      title="登入工作階段"
      description="管理目前登入中的裝置"
      {...rest}
    >
      <SessionList sessions={sessions} />
    </SettingsCard>
  );
};

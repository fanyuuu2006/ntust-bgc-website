import { getSessionTokenFromCookie } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";
import type { UUID } from "@/types/database";
import { SessionList } from "./SessionList";

export async function SessionSettingsSection({ userId }: { userId: UUID }) {
  const token = await getSessionTokenFromCookie();

  return (
    <section aria-labelledby="session-settings-title">
      <div>
        <h3 id="session-settings-title" className="font-semibold text-(--text-primary)">
          登入工作階段
        </h3>
        <p className="mt-1 text-sm text-(--text-muted)">
          查看並撤銷目前帳號的其他登入工作階段。
        </p>
      </div>

      <div className="mt-4">
        {token ? (
          <SessionList sessions={await authService.listSessions(userId, token)} />
        ) : (
          <p role="status" className="text-sm text-(--text-muted)">
            暫時無法取得登入工作階段，請重新整理後再試。
          </p>
        )}
      </div>
    </section>
  );
}

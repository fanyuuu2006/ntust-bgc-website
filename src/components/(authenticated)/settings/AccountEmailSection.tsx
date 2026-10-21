import { ResendEmailVerificationButton } from "@/components/(auth)/email-verification/ResendEmailVerificationButton";
import type { User } from "@/types/database";

export function AccountEmailSection({ user }: { user: Pick<User, "email" | "email_verified_at"> }) {
  return (
    <section aria-labelledby="account-email-title">
      <h3 id="account-email-title" className="font-semibold text-(--text-primary)">登入 Email</h3>
      <div
        aria-readonly="true"
        aria-labelledby="settings-email-label"
        aria-describedby="settings-email-hint"
        className="mt-4 min-w-0 rounded-xl border border-(--border-muted) bg-(--surface-subtle) px-3 py-3"
      >
        <p id="settings-email-label" className="text-sm font-medium text-(--text-primary)">Email</p>
        <p className="mt-1 break-all text-sm text-(--text-secondary)" title={user.email}>{user.email}</p>
        <p id="settings-email-hint" className="mt-1 text-xs text-(--text-muted)">Email 為登入帳號，目前無法修改</p>
        <p className="mt-2 text-xs font-medium text-(--text-secondary)">{user.email_verified_at ? "Email 已驗證" : "Email 尚未驗證"}</p>
        {!user.email_verified_at ? <div className="mt-3"><ResendEmailVerificationButton /></div> : null}
      </div>
    </section>
  );
}

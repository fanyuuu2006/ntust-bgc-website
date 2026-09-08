import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/(auth)/AuthCard";
import { ResendEmailVerificationButton } from "@/components/(auth)/email-verification/ResendEmailVerificationButton";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/libs/auth";

export const metadata: Metadata = {
  title: "等待 Email 驗證",
  description: "完成 Email 驗證後即可使用完整帳號功能。",
  robots: { index: false, follow: false },
};

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) return "***";
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
}

export default async function EmailVerificationPendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=%2Fverify-email%2Fpending");
  if (user.email_verified_at) redirect("/dashboard");

  return (
    <section className="flex flex-1 items-center py-8 sm:py-10">
      <div className="container flex justify-center">
        <AuthCard
          title="Email 尚未完成驗證"
          description="完成 Email 驗證後，即可使用完整帳號功能。"
          className="w-full max-w-md"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-(--surface-subtle) px-3 py-2.5">
              <p className="text-xs font-medium text-(--text-muted)">
                驗證信已寄送至
              </p>
              <p className="mt-0.5 break-all font-semibold text-(--text-primary)">
                {maskEmail(user.email)}
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
              <ResendEmailVerificationButton />
              <LogoutButton
                variant="danger"
                size="sm"
                className="w-full sm:w-auto"
              >
                登出
              </LogoutButton>
            </div>
          </div>
        </AuthCard>
      </div>
    </section>
  );
}

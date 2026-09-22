import type { Metadata } from "next";
import { AuthCard } from "@/components/(auth)/AuthCard";
import { ResetPasswordForm } from "@/components/(auth)/password-recovery/ResetPasswordForm";
import { ButtonLink } from "@/components/ui/Button";
import { passwordRecoveryService } from "@/services/auth/password-recovery.service";
import { isErrorId } from "@/libs/observability/reference";
import { ErrorReference } from "@/components/ErrorReference";
import { cookies } from "next/headers";
import { RECOVERY_COOKIE_NAME } from "@/services/auth/password-recovery.service";

export const metadata: Metadata = { title: "重設密碼", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ result?: string | string[]; errorId?: string | string[] }> }) {
  const params = await searchParams;
  const token = (await cookies()).get(RECOVERY_COOKIE_NAME)?.value ?? "";
  const result = typeof params.result === "string" ? params.result : "";
  const valid = token ? await passwordRecoveryService.inspect(token) : false;
  return <section className="container flex justify-center py-8"><AuthCard title={valid ? "重設密碼" : "重設連結無法使用"} description={valid ? "請設定新密碼。完成後，所有既有登入狀態都會失效。" : "連結可能已過期或已使用，請重新申請密碼重設。"} className="w-full max-w-md">
    {valid ? <ResetPasswordForm invalidPassword={result === "password-invalid"} /> : <div className="space-y-4">
      {result === "error" && isErrorId(params.errorId) ? <ErrorReference errorId={params.errorId} /> : null}
      <ButtonLink href="/forgot-password" variant="outline">重新申請連結</ButtonLink>
    </div>}
  </AuthCard></section>;
}

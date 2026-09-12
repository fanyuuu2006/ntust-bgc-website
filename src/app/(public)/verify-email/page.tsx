import { withServerErrorReference } from "@/libs/observability/server-render";
import { ErrorReference } from "@/components/ErrorReference";
import { isErrorId } from "@/libs/observability/reference";
import type { Metadata } from "next";

import { AuthCard } from "@/components/(auth)/AuthCard";
import { EmailVerificationConfirmForm } from "@/components/(auth)/email-verification/EmailVerificationConfirmForm";
import { ButtonLink } from "@/components/ui/Button";
import { emailVerificationService } from "@/services/email-verification/email-verification.service";

export const metadata: Metadata = {
  title: "Email 驗證",
  description: "完成臺科大桌遊社網站帳號的 Email 驗證。",
  robots: { index: false, follow: false },
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    result?: string | string[];
    errorId?: string | string[];
  }>;
};

async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const result = typeof params.result === "string" ? params.result : "";
  if (result === "error" && isErrorId(params.errorId)) {
    return <section className="container max-w-xl py-8"><AuthCard title="Email 驗證暫時無法完成" description="請稍後從原驗證信重新開啟連結，再試一次。">
      <ErrorReference errorId={params.errorId} />
      <ButtonLink href="/login" variant="outline" className="mt-4">返回登入</ButtonLink>
    </AuthCard></section>;
  }
  const tokenState = token
    ? await emailVerificationService.inspect(token)
    : "invalid";

  if (result === "success") {
    return (
      <section className="flex flex-1 items-center py-8 sm:py-10">
        <div className="container flex justify-center">
          <AuthCard
            title="Email 驗證完成"
            description="你的 Email 已完成驗證，現在可以使用網站的完整帳號功能。"
            className="w-full max-w-md"
          >
            <ButtonLink
              href="/dashboard"
              variant="primary"
              className="w-full sm:w-auto"
            >
              前往 Dashboard
            </ButtonLink>
          </AuthCard>
        </div>
      </section>
    );
  }

  if (tokenState === "valid") {
    return (
      <section className="flex flex-1 items-center py-8 sm:py-10">
        <div className="container flex justify-center">
          <AuthCard
            title="確認 Email 驗證"
            description="為了確認這個 Email 是你本人使用的信箱，請完成最後一步驗證。"
            className="w-full max-w-md"
          >
            <EmailVerificationConfirmForm token={token} />
          </AuthCard>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 items-center py-8 sm:py-10">
      <div className="container flex justify-center">
        <AuthCard
          title="驗證連結已失效"
          description="這個驗證連結可能已過期、已使用，或不是有效連結。"
          className="w-full max-w-md"
        >
          <ButtonLink
            href="/login"
            variant="outline"
            className="w-full sm:w-auto"
          >
            返回登入
          </ButtonLink>
        </AuthCard>
      </div>
    </section>
  );
}

export default withServerErrorReference(VerifyEmailPage, "/verify-email");

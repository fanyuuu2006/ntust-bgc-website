import type { Metadata } from "next";

import { ResendEmailVerificationButton } from "@/components/(auth)/email-verification/ResendEmailVerificationButton";
import { ButtonLink } from "@/components/ui/Button";
import { emailVerificationService } from "@/services/email-verification/email-verification.service";

export const metadata: Metadata = {
  title: "Email 驗證",
  description: "完成臺科大桌遊社網站帳號的 Email 驗證。",
  robots: { index: false, follow: false },
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const rawToken = (await searchParams).token;
  const token = typeof rawToken === "string" ? rawToken : "";
  const result = token
    ? await emailVerificationService.verify(token)
    : "invalid";

  return (
    <main className="container flex min-h-[55vh] items-center justify-center py-10 sm:py-14">
      <section className="w-full max-w-lg rounded-2xl border border-(--border-default) bg-(--surface-default) p-6 shadow-(--shadow-card) sm:p-8">
        {result === "verified" ? (
          <>
            <h1 className="text-2xl font-bold text-(--text-primary)">
              Email 驗證成功
            </h1>
            <p className="mt-3 leading-7 text-(--text-muted)">
              你的 Email 已完成驗證。
            </p>
            <ButtonLink href="/login" className="mt-6 w-full sm:w-auto">
              前往我的頁面
            </ButtonLink>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-(--text-primary)">
              驗證連結無法使用
            </h1>
            <p className="mt-3 leading-7 text-(--text-muted)">
              這個驗證連結無效或已失效。
            </p>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              若你已登入，可以重新寄送一封新的驗證信。
            </p>
            <div className="mt-6">
              <ResendEmailVerificationButton />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

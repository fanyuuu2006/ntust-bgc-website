import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("verification states reuse the canonical auth surface and public landmark", async () => {
  const [verificationPage, pendingPage] = await Promise.all([
    readSource("src/app/(public)/verify-email/page.tsx"),
    readSource("src/app/(public)/verify-email/pending/page.tsx"),
  ]);

  assert.match(verificationPage, /AuthCard/);
  assert.match(pendingPage, /AuthCard/);
  assert.doesNotMatch(verificationPage, /<main\b/);
  assert.doesNotMatch(pendingPage, /<main\b/);
  assert.match(verificationPage, /max-w-md/);
  assert.match(pendingPage, /max-w-md/);
});

test("confirmation uses the canonical Button while preserving scanner-safe POST", async () => {
  const [page, form] = await Promise.all([
    readSource("src/app/(public)/verify-email/page.tsx"),
    readSource(
      "src/components/(auth)/email-verification/EmailVerificationConfirmForm.tsx",
    ),
  ]);

  assert.match(page, /EmailVerificationConfirmForm/);
  assert.doesNotMatch(page, /<button\b/);
  assert.match(form, /import \{ Button \}/);
  assert.match(form, /action="\/api\/auth\/email-verification\/confirm"/);
  assert.match(form, /method="post"/);
  assert.match(form, /type="submit"/);
  assert.match(form, /variant="primary"/);
  assert.match(form, /isLoading=\{isPending\}/);
  assert.match(form, /if \(isPending\)/);
  assert.match(form, /name="token"/);
});

test("pending actions keep canonical resend and danger logout responsibilities", async () => {
  const [pendingPage, resend] = await Promise.all([
    readSource("src/app/(public)/verify-email/pending/page.tsx"),
    readSource(
      "src/components/(auth)/email-verification/ResendEmailVerificationButton.tsx",
    ),
  ]);

  assert.match(resend, /<Button/);
  assert.match(resend, /variant="outline"/);
  assert.match(resend, /isLoading=\{isLoading\}/);
  assert.match(pendingPage, /<LogoutButton[\s\S]*variant="danger"/);
  assert.match(pendingPage, /ResendEmailVerificationButton/);
});

test("pending mobile actions are equally usable without changing their semantics", async () => {
  const page = await readSource(
    "src/app/(public)/verify-email/pending/page.tsx",
  );
  const resendPosition = page.indexOf("<ResendEmailVerificationButton");
  const logoutPosition = page.indexOf("<LogoutButton");

  assert.ok(resendPosition >= 0 && resendPosition < logoutPosition);
  assert.match(
    page,
    /flex flex-col items-stretch gap-3 sm:flex-row sm:items-start/,
  );
  assert.match(
    page,
    /<LogoutButton[\s\S]*size="sm"[\s\S]*className="w-full sm:w-auto"/,
  );
});

test("pending copy and email surface use compact mobile rhythm", async () => {
  const page = await readSource(
    "src/app/(public)/verify-email/pending/page.tsx",
  );

  assert.match(
    page,
    /description="完成 Email 驗證後，即可使用完整帳號功能。"/,
  );
  assert.match(page, /space-y-4/);
  assert.match(page, /bg-\(--surface-subtle\) px-3 py-2\.5/);
  assert.match(page, /mt-0\.5 break-all/);
});

test("verification short pages fill the shell main slot without viewport math", async () => {
  const [shell, verificationPage, pendingPage] = await Promise.all([
    readSource("src/components/layouts/WebsiteShell.tsx"),
    readSource("src/app/(public)/verify-email/page.tsx"),
    readSource("src/app/(public)/verify-email/pending/page.tsx"),
  ]);

  assert.match(shell, /<main[\s\S]*flex-1 flex-col/);
  assert.match(
    verificationPage,
    /<section className="flex flex-1 items-center py-8 sm:py-10">/,
  );
  assert.match(
    pendingPage,
    /<section className="flex flex-1 items-center py-8 sm:py-10">/,
  );

  for (const source of [verificationPage, pendingPage]) {
    assert.doesNotMatch(source, /min-h-screen|min-h-\[[^\]]*vh|calc\(/);
  }
  assert.match(shell, /\{children\}[\s\S]*<\/main>[\s\S]*<Footer/);
});

test("success and invalid states expose safe canonical destinations", async () => {
  const page = await readSource("src/app/(public)/verify-email/page.tsx");

  assert.match(page, /Email 驗證完成/);
  assert.match(page, /href="\/dashboard"[\s\S]*variant="primary"/);
  assert.match(page, /驗證連結已失效/);
  assert.match(page, /href="\/login"/);
  assert.doesNotMatch(page, /ResendEmailVerificationButton/);
  assert.doesNotMatch(page, /token_hash|error\.message|digest|Brevo/i);
});

test("verification UI changes do not alter the verification domain contract", async () => {
  const [page, confirmRoute, service] = await Promise.all([
    readSource("src/app/(public)/verify-email/page.tsx"),
    readSource("src/app/api/auth/email-verification/confirm/route.ts"),
    readSource(
      "src/services/email-verification/email-verification.service.ts",
    ),
  ]);

  assert.match(page, /emailVerificationService\.inspect/);
  assert.match(confirmRoute, /emailVerificationService\.verify/);
  assert.match(confirmRoute, /status: 303/);
  assert.match(service, /repository\.consume/);
});

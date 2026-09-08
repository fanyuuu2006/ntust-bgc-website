import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadCommonJs(path, overrides) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    (specifier) => {
      if (specifier in overrides) return overrides[specifier];
      throw new Error(`Unexpected dependency in ${path}: ${specifier}`);
    },
  );
  return runtimeModule.exports;
}

test("verified authorization distinguishes anonymous, unverified, and verified sessions", async () => {
  const json = (body, init) => ({ body, status: init.status });
  const loadAuthorization = (user) =>
    loadCommonJs("src/libs/api/verified-authorization.ts", {
      "server-only": {},
      "next/server": { NextResponse: { json } },
      "@/libs/auth": { getCurrentUser: async () => user },
    });

  const anonymous = await loadAuthorization(null);
  assert.deepEqual(await anonymous.authorizeVerifiedRequest(), {
    user: null,
    response: {
      body: { message: "請先登入" },
      status: 401,
    },
  });

  const unverified = await loadAuthorization({
    id: "user-1",
    email_verified_at: null,
  });
  const unverifiedResult = await unverified.authorizeVerifiedRequest();
  assert.equal(unverifiedResult.user, null);
  assert.equal(unverifiedResult.response.status, 403);
  assert.equal(unverifiedResult.response.body.code, "EMAIL_VERIFICATION_REQUIRED");

  const user = {
    id: "user-2",
    email_verified_at: "2026-09-08T00:00:00.000Z",
  };
  const verified = await loadAuthorization(user);
  assert.deepEqual(await verified.authorizeVerifiedRequest(), {
    user,
    response: null,
  });
});

test("page guards route an authenticated unverified account only to verification pending", async () => {
  const [auth, authenticated, admin] = await Promise.all([
    readSource("src/app/(auth)/layout.tsx"),
    readSource("src/app/(authenticated)/layout.tsx"),
    readSource("src/app/(admin)/layout.tsx"),
  ]);

  assert.match(auth, /email_verified_at[\s\S]*verify-email\/pending/);
  assert.match(authenticated, /email_verified_at[\s\S]*verify-email\/pending/);
  assert.match(admin, /email_verified_at[\s\S]*verify-email\/pending/);
  assert.match(admin, /email_verified_at[\s\S]*isAdminByUserId/);
});

test("login creates the session but sends unverified users to the waiting route", async () => {
  const [route, form, service] = await Promise.all([
    readSource("src/app/api/auth/login/route.ts"),
    readSource("src/components/(auth)/login/LoginForm.tsx"),
    readSource("src/services/auth/auth.service.tsx"),
  ]);

  assert.match(service, /sessionRepository\.create/);
  assert.match(route, /emailVerified:\s*Boolean\(user\.email_verified_at\)/);
  assert.match(form, /emailVerified/);
  assert.match(form, /verify-email\/pending/);
  assert.match(form, /emailVerified \? returnTo/);
});

test("waiting page is session-aware, masks email, and exposes resend plus logout", async () => {
  const page = await readSource("src/app/(public)/verify-email/pending/page.tsx");
  assert.match(page, /getCurrentUser/);
  assert.match(page, /email_verified_at/);
  assert.match(page, /Email 尚未完成驗證/);
  assert.match(page, /maskEmail/);
  assert.match(page, /ResendEmailVerificationButton/);
  assert.match(page, /LogoutButton/);
  assert.doesNotMatch(page, /setInterval|WebSocket|EventSource/);
});

test("formal account APIs share the verified-account authorization boundary", async () => {
  const protectedRoutes = [
    "src/app/api/users/me/account/route.ts",
    "src/app/api/users/me/profile/route.ts",
    "src/app/api/users/me/borrowings/route.ts",
    "src/app/api/users/me/borrowings/[id]/cancel/route.ts",
    "src/app/api/memberships/activate/route.ts",
    "src/app/api/events/[id]/check-in/route.ts",
    "src/app/api/board-games/[id]/borrow/route.ts",
    "src/app/api/auth/password/route.ts",
    "src/app/api/auth/sessions/route.ts",
    "src/app/api/auth/sessions/[id]/route.ts",
  ];

  for (const path of protectedRoutes) {
    const source = await readSource(path);
    assert.match(source, /authorizeVerifiedRequest/, path);
  }

  const [resend, logout] = await Promise.all([
    readSource("src/app/api/auth/email-verification/resend/route.ts"),
    readSource("src/app/api/auth/logout/route.ts"),
  ]);
  assert.doesNotMatch(resend, /authorizeVerifiedRequest/);
  assert.doesNotMatch(logout, /authorizeVerifiedRequest/);
});

test("Admin authorization requires verification before historical officer status", async () => {
  const source = await readSource("src/libs/api/admin-authorization.ts");
  assert.match(source, /authorizeVerifiedRequest/);
  assert.match(source, /authorization\.response[\s\S]*isAdminByUserId/);
});

test("verification GET inspects only and explicit POST consumes the token", async () => {
  const [page, form, confirmRoute] = await Promise.all([
    readSource("src/app/(public)/verify-email/page.tsx"),
    readSource(
      "src/components/(auth)/email-verification/EmailVerificationConfirmForm.tsx",
    ),
    readSource("src/app/api/auth/email-verification/confirm/route.ts"),
  ]);

  assert.match(page, /emailVerificationService\.inspect/);
  assert.doesNotMatch(page, /emailVerificationService\.verify/);
  assert.match(page, /EmailVerificationConfirmForm/);
  assert.match(form, /method="post"/i);
  assert.match(form, /\/api\/auth\/email-verification\/confirm/);
  assert.match(confirmRoute, /emailVerificationService\.verify/);
  assert.match(confirmRoute, /status:\s*303/);
});

test("verification service keeps validation separate from one-time consumption", async () => {
  const serviceModule = await loadCommonJs(
    "src/services/email-verification/email-verification.service.ts",
    {
      "server-only": {},
      "@/libs/email/sender": {
        getTransactionalEmailSender: () => ({ send: async () => {} }),
      },
      "@/libs/siteConfigs": { siteConfigs: { url: "https://example.test" } },
      "@/repositories/email-verification.repository": {
        emailVerificationRepository: {
          issue: async () => "issued",
          inspect: async () => "valid",
          consume: async () => "verified",
        },
      },
      "./email-verification.errors": {
        EmailVerificationCooldownError: class extends Error {},
      },
      "./email-verification-token": {
        generateEmailVerificationToken: () => "x".repeat(43),
        hashEmailVerificationToken: () => "token-hash",
      },
    },
  );

  let inspections = 0;
  let consumptions = 0;
  const service = serviceModule.createEmailVerificationService({
    repository: {
      issue: async () => "issued",
      inspect: async () => {
        inspections += 1;
        return "valid";
      },
      consume: async () => {
        consumptions += 1;
        return consumptions === 1 ? "verified" : "invalid";
      },
    },
    getSender: () => ({ send: async () => {} }),
    now: () => new Date("2026-09-08T00:00:00.000Z"),
    generateToken: () => "x".repeat(43),
    hashToken: () => "token-hash",
    getSiteOrigin: () => "https://example.test",
  });

  assert.equal(await service.inspect("x".repeat(43)), "valid");
  assert.equal(inspections, 1);
  assert.equal(consumptions, 0);
  assert.equal(await service.verify("x".repeat(43)), "verified");
  assert.equal(consumptions, 1);
  assert.equal(await service.verify("x".repeat(43)), "invalid");
  assert.equal(consumptions, 2);
});

test("email verification remains independent from Membership while borrowing uses the gate", async () => {
  const [authorization, borrowRoute] = await Promise.all([
    readSource("src/libs/api/verified-authorization.ts"),
    readSource("src/app/api/board-games/[id]/borrow/route.ts"),
  ]);
  assert.doesNotMatch(authorization, /Membership|officer|role/i);
  assert.match(borrowRoute, /authorizeVerifiedRequest/);
  assert.doesNotMatch(borrowRoute, /currentMembership|membershipService/);
});

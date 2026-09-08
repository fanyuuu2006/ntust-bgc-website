import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadTokenModule() {
  const source = await readSource(
    "src/services/email-verification/email-verification-token.ts",
  );
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    (specifier) => {
      if (specifier === "node:crypto") return awaitImportCrypto;
      throw new Error(`Unexpected token dependency: ${specifier}`);
    },
  );
  return runtimeModule.exports;
}

const awaitImportCrypto = {
  randomBytes: (await import("node:crypto")).randomBytes,
  createHash: (await import("node:crypto")).createHash,
};

async function loadCommonJs(path, localRequire) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    localRequire,
  );
  return runtimeModule.exports;
}

test("migration adds explicit verification state and atomic one-time token storage", async () => {
  const migration = await readSource(
    "supabase/migrations/202609080001_add_email_verification.sql",
  );
  assert.match(migration, /add column email_verified_at timestamptz/);
  assert.match(migration, /update public\.users[\s\S]*email_verified_at = now\(\)/);
  assert.match(migration, /create table public\.email_verification_tokens/);
  assert.match(migration, /token_hash text not null/);
  assert.doesNotMatch(migration, /\braw_token\b|\btoken text\b/);
  assert.match(migration, /expires_at timestamptz not null/);
  assert.match(migration, /consumed_at timestamptz/);
  assert.match(migration, /references public\.users\s*\(id\)[\s\S]*on delete cascade/);
  assert.match(migration, /issue_email_verification_token/);
  assert.match(migration, /consume_email_verification_token/);
  assert.doesNotMatch(migration, /memberships|officer_positions|board_game_borrowings/i);
});

test("verification tokens are high-entropy URL-safe values and only hashes persist", async () => {
  const { generateEmailVerificationToken, hashEmailVerificationToken } =
    await loadTokenModule();
  const first = generateEmailVerificationToken();
  const second = generateEmailVerificationToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(hashEmailVerificationToken(first).length, 64);
  assert.notEqual(hashEmailVerificationToken(first), first);

  const repository = await readSource(
    "src/repositories/email-verification.repository.ts",
  );
  assert.match(repository, /tokenHash/);
  assert.doesNotMatch(repository, /rawToken|raw_token/);
});

test("transactional email contract is provider-neutral and Brevo stays isolated", async () => {
  const contract = await readSource("src/libs/email/transactional-email.ts");
  const adapter = await readSource("src/libs/email/brevo.ts");
  const service = await readSource(
    "src/services/email-verification/email-verification.service.ts",
  );
  const registration = await readSource("src/app/api/auth/register/route.ts");

  assert.match(contract, /TransactionalEmailSender/);
  assert.match(contract, /send\(message: TransactionalEmail\)/);
  assert.doesNotMatch(contract, /Brevo|api\.brevo\.com/i);
  assert.match(adapter, /https:\/\/api\.brevo\.com\/v3\/smtp\/email/);
  assert.match(adapter, /api-key/);
  assert.doesNotMatch(service, /api\.brevo\.com|BREVO_API_KEY/);
  assert.doesNotMatch(registration, /api\.brevo\.com|BREVO_API_KEY|randomBytes/);
});

test("email configuration is lazy, validated, and server-only", async () => {
  const env = await readSource("src/libs/env.tsx");
  const adapter = await readSource("src/libs/email/brevo.ts");
  assert.match(env, /getEmailConfig/);
  assert.match(env, /BREVO_API_KEY/);
  assert.match(env, /EMAIL_FROM/);
  assert.match(env, /EMAIL_FROM_NAME/);
  assert.match(adapter, /import "server-only"/);
  assert.doesNotMatch(adapter, /NEXT_PUBLIC_/);

  const { resolveEmailConfig } = await loadCommonJs(
    "src/libs/env.tsx",
    () => {
      throw new Error("env module has no runtime imports");
    },
  );
  assert.deepEqual(
    resolveEmailConfig({
      apiKey: " key ",
      from: " Club@Example.com ",
      fromName: " Club ",
    }),
    { apiKey: "key", from: "club@example.com", fromName: "Club" },
  );
  assert.throws(
    () =>
      resolveEmailConfig({
        apiKey: "",
        from: "club@example.com",
        fromName: "Club",
      }),
    /BREVO_API_KEY/,
  );
});

test("Brevo adapter maps request data and failures without leaking provider responses", async () => {
  class DeliveryError extends Error {}
  const { BrevoTransactionalEmailSender } = await loadCommonJs(
    "src/libs/email/brevo.ts",
    (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "./transactional-email") {
        return { TransactionalEmailDeliveryError: DeliveryError };
      }
      throw new Error(`Unexpected Brevo dependency: ${specifier}`);
    },
  );

  let request;
  const sender = new BrevoTransactionalEmailSender(
    { apiKey: "secret", from: "club@example.com", fromName: "Club" },
    async (url, init) => {
      request = { url, init };
      return { ok: true };
    },
  );
  await sender.send({
    to: "member@example.com",
    subject: "Verify",
    text: "Plain",
    html: "<p>HTML</p>",
  });
  assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(request.init.headers["api-key"], "secret");
  assert.deepEqual(JSON.parse(request.init.body), {
    sender: { email: "club@example.com", name: "Club" },
    to: [{ email: "member@example.com" }],
    subject: "Verify",
    textContent: "Plain",
    htmlContent: "<p>HTML</p>",
  });

  const failingSender = new BrevoTransactionalEmailSender(
    { apiKey: "secret", from: "club@example.com", fromName: "Club" },
    async () => ({ ok: false, status: 400, body: "private provider detail" }),
  );
  await assert.rejects(() => failingSender.send({
    to: "member@example.com",
    subject: "Verify",
    text: "Plain",
    html: "<p>HTML</p>",
  }), DeliveryError);
});

test("verification service issues hashed tokens, sends links, and consumes once through repository", async () => {
  class CooldownError extends Error {
    constructor(retryAfter) {
      super("cooldown");
      this.retryAfter = retryAfter;
    }
  }
  const serviceModule = await loadCommonJs(
    "src/services/email-verification/email-verification.service.ts",
    (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "@/libs/email/sender") {
        return { getTransactionalEmailSender: () => ({ send: async () => {} }) };
      }
      if (specifier === "@/libs/siteConfigs") {
        return { siteConfigs: { url: "https://canonical.example" } };
      }
      if (specifier === "@/repositories/email-verification.repository") {
        return {
          emailVerificationRepository: {
            issue: async () => "issued",
            consume: async () => "verified",
          },
        };
      }
      if (specifier.endsWith("email-verification.errors")) {
        return { EmailVerificationCooldownError: CooldownError };
      }
      if (specifier.endsWith("email-verification-token")) {
        return {
          generateEmailVerificationToken: () => "x".repeat(43),
          hashEmailVerificationToken: (value) => `hash:${value}`,
        };
      }
      throw new Error(`Unexpected service dependency: ${specifier}`);
    },
  );

  const issued = [];
  const sent = [];
  const consumed = [];
  const service = serviceModule.createEmailVerificationService({
    repository: {
      issue: async (input) => {
        issued.push(input);
        return "issued";
      },
      consume: async (hash) => {
        consumed.push(hash);
        return "verified";
      },
    },
    getSender: () => ({ send: async (message) => sent.push(message) }),
    now: () => new Date("2026-09-08T00:00:00.000Z"),
    generateToken: () => "a".repeat(43),
    hashToken: (token) => `hashed:${token.length}`,
    getSiteOrigin: () => "https://canonical.example",
  });

  assert.equal(
    await service.request({
      id: "user-1",
      email: "member@example.com",
      name: "王小明",
      email_verified_at: null,
    }),
    "sent",
  );
  assert.equal(issued[0].tokenHash, "hashed:43");
  assert.equal(JSON.stringify(issued).includes("a".repeat(43)), false);
  assert.match(sent[0].text, /https:\/\/canonical\.example\/verify-email\?token=/);
  assert.equal(
    new Date(issued[0].expiresAt).getTime() - Date.parse("2026-09-08T00:00:00.000Z"),
    60 * 60 * 1000,
  );

  assert.equal(await service.verify("bad token"), "invalid");
  assert.equal(consumed.length, 0);
  assert.equal(await service.verify("b".repeat(43)), "verified");
  assert.deepEqual(consumed, ["hashed:43"]);
});

test("verification resend is idempotent for verified users and enforces cooldown", async () => {
  class CooldownError extends Error {
    constructor(retryAfter) {
      super("cooldown");
      this.retryAfter = retryAfter;
    }
  }
  const serviceModule = await loadCommonJs(
    "src/services/email-verification/email-verification.service.ts",
    (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "@/libs/email/sender") {
        return { getTransactionalEmailSender: () => ({}) };
      }
      if (specifier === "@/libs/siteConfigs") {
        return { siteConfigs: { url: "https://canonical.example" } };
      }
      if (specifier === "@/repositories/email-verification.repository") {
        return {
          emailVerificationRepository: {
            issue: async () => "issued",
            consume: async () => "verified",
          },
        };
      }
      if (specifier.endsWith("email-verification.errors")) {
        return { EmailVerificationCooldownError: CooldownError };
      }
      if (specifier.endsWith("email-verification-token")) {
        return {
          generateEmailVerificationToken: () => "x".repeat(43),
          hashEmailVerificationToken: (value) => value,
        };
      }
      throw new Error(`Unexpected service dependency: ${specifier}`);
    },
  );

  let issueCalls = 0;
  const makeService = (issueResult) =>
    serviceModule.createEmailVerificationService({
      repository: {
        issue: async () => {
          issueCalls += 1;
          return issueResult;
        },
        consume: async () => "invalid",
      },
      getSender: () => ({ send: async () => {} }),
      now: () => new Date("2026-09-08T00:00:00.000Z"),
      generateToken: () => "x".repeat(43),
      hashToken: (value) => value,
      getSiteOrigin: () => "https://canonical.example",
    });

  assert.equal(
    await makeService("issued").request({
      id: "user-1",
      email: "member@example.com",
      name: "Member",
      email_verified_at: "2026-09-01T00:00:00.000Z",
    }),
    "already_verified",
  );
  assert.equal(issueCalls, 0);
  await assert.rejects(
    () =>
      makeService("cooldown").request({
        id: "user-1",
        email: "member@example.com",
        name: "Member",
        email_verified_at: null,
      }),
    (error) => error instanceof CooldownError && error.retryAfter === 60,
  );
});

test("registration preserves atomic account creation and reports delivery outcome", async () => {
  const authService = await readSource("src/services/auth/auth.service.tsx");
  const route = await readSource("src/app/api/auth/register/route.ts");
  const form = await readSource(
    "src/components/(auth)/register/RegisterForm.tsx",
  );

  assert.match(authService, /authRepository\.registerUser/);
  assert.match(route, /emailVerificationService\.request/);
  assert.match(route, /delivery_failed/);
  assert.match(route, /sent/);
  assert.match(form, /帳號已建立/);
  assert.match(form, /驗證信/);
  assert.doesNotMatch(form, /Brevo|SMTP|provider/i);
});

test("verification and authenticated resend routes expose safe domain states", async () => {
  const page = await readSource("src/app/(public)/verify-email/page.tsx");
  const resend = await readSource(
    "src/app/api/auth/email-verification/resend/route.ts",
  );

  assert.match(page, /Email 驗證完成/);
  assert.match(page, /驗證連結已失效/);
  assert.doesNotMatch(page, /token_hash|error\.message|Brevo|digest/i);
  assert.match(resend, /getCurrentUser/);
  assert.match(resend, /status: 401/);
  assert.match(resend, /already_verified/);
  assert.match(resend, /Retry-After/);
});

test("verification service owns expiration, cooldown, URL construction, and email copy", async () => {
  const service = await readSource(
    "src/services/email-verification/email-verification.service.ts",
  );
  assert.match(service, /60 \* 60 \* 1000/);
  assert.match(service, /60 \* 1000/);
  assert.match(service, /new URL\("\/verify-email"/);
  assert.match(service, /siteConfigs\.url/);
  assert.match(service, /驗證你的臺科大桌遊社網站 Email/);
  assert.match(service, /text:/);
  assert.match(service, /html:/);
  assert.doesNotMatch(service, /Membership|Officer|Borrowing/);
});

test("credential login stays separate while verified state gates formal account access", async () => {
  const authService = await readSource("src/services/auth/auth.service.tsx");
  const authenticatedLayout = await readSource(
    "src/app/(authenticated)/layout.tsx",
  );
  const adminLayout = await readSource("src/app/(admin)/layout.tsx");
  const borrowRoute = await readSource(
    "src/app/api/board-games/[id]/borrow/route.ts",
  );
  assert.doesNotMatch(authService, /email_verified_at/);
  assert.match(authenticatedLayout, /email_verified_at/);
  assert.match(adminLayout, /email_verified_at/);
  assert.match(borrowRoute, /authorizeVerifiedRequest/);
  assert.doesNotMatch(borrowRoute, /membershipService|currentMembership/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { load } from "./helpers/load-app-module.mjs";

test("concurrent registration relies on atomic unique failure and emits one safe 409 without email preflight", async () => {
  let winner = false, deliveries = 0;
  const requests = [];
  const { createSupabaseFetch } = load("src/libs/supabase/fetch.ts");
  // 模擬 DB 唯一約束的原子勝負；實際 schema 的約束另在下方核對。
  const supabase = createClient("https://fixture.invalid", "sb_secret_fixture", {
    auth: { persistSession: false }, global: { fetch: createSupabaseFetch(async (url, init) => {
      requests.push({ path: new URL(url).pathname, method: init.method });
      if (winner) return Response.json({ code: "23505", message: "duplicate key users_email_key", details: "private@example.invalid" }, { status: 409 });
      winner = true;
      return Response.json({ id: "fixture", name: "fixture", email: "fixture@example.invalid" });
    }) },
  });
  const errors = load("src/services/auth/auth.errors.tsx");
  const repositoryErrors = load("src/repositories/shared/errors.ts");
  const { POST } = load("src/app/api/auth/register/route.ts", {
    "@/services/auth/auth.errors": errors,
    "./auth.errors": errors,
    "@/repositories/shared/errors": repositoryErrors,
    "./shared/errors": repositoryErrors,
    "@/libs/supabase/server": { supabase },
    "@/utils/auth/password": { hashPassword: async () => "test-hash" },
    "@/libs/security/turnstile": { verifyTurnstile: async () => true },
    "@/libs/security/rate-limit": { checkRateLimit: () => ({ allowed: true }), getRequestIp: () => "fixture" },
    "@/services/email-verification/email-verification.service": { emailVerificationService: { request: async () => { deliveries++; } } },
  });
  const request = () => new Request("https://fixture.invalid/api/auth/register", { method: "POST", body: JSON.stringify({ name: "fixture", email: "fixture@example.invalid", password: "Password123!", confirmPassword: "Password123!", acceptTerms: true, real_name: "fixture", phone: "0912345678", turnstileToken: "fixture" }) });
  const responses = await Promise.all([POST(request()), POST(request())]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  const body = await responses.find((r) => r.status === 409).json();
  assert.match(body.message, /已/);
  assert.doesNotMatch(JSON.stringify(body), /23505|users_email_key|private@example|errorId/);
  assert.equal(deliveries, 1);
  assert.deepEqual(requests, Array.from({ length: 2 }, () => ({ path: "/rest/v1/rpc/register_user", method: "POST" })));
  const sql = readFileSync("supabase/schema/canonical-public-schema.sql", "utf8");
  assert.match(sql, /constraint users_email_key unique \(email\)/);
  assert.match(sql, /function public\.register_user\([\s\S]*?insert into public\.users/i);
});

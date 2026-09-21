import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("recovery request has the same public result for eligible and ineligible identities", async () => {
  const user = { id: "user-1", email: "person@example.test", closed_at: null };
  const issued = [];
  const sent = [];
  const activated = [];
  let current = user;
  const service = load("src/services/auth/password-recovery.service.ts", {
    "@/repositories/users.repository": { usersRepository: { findByEmail: async () => current } },
    "@/repositories/password-recovery.repository": { passwordRecoveryRepository: {
      issue: async (...args) => { issued.push(args); return "issued"; },
      activate: async (hash) => { activated.push(hash); return true; },
      invalidate: async () => {}, inspect: async () => true, consume: async () => "reset",
    } },
    "@/libs/email/sender": { getTransactionalEmailSender: () => ({ send: async (message) => sent.push(message) }) },
    "@/libs/siteConfigs": { siteConfigs: { url: "https://example.test" } },
    "@/libs/observability/report": { reportUnexpectedError: () => "safe-id" },
    "@/utils/auth/password": { hashPassword: async () => "$argon2id$test" },
  }).passwordRecoveryService;
  assert.equal(await service.request({ email: user.email }), undefined);
  assert.equal(issued.length, 1);
  assert.equal(sent.length, 1);
  assert.equal(activated.length, 1);
  assert.equal(activated[0], issued[0][1]);
  assert.match(sent[0].text, /password-recovery\/open\?token=/);
  assert.doesNotMatch(JSON.stringify(issued), /[A-Za-z0-9_-]{43}=/);
  current = null;
  assert.equal(await service.request({ email: "missing@example.test" }), undefined);
  current = { ...user, closed_at: "2026-09-20T00:00:00Z" };
  assert.equal(await service.request({ email: user.email }), undefined);
  assert.equal(issued.length, 1);
});

test("recovery migration keeps issue/reset transactional and service-role only", async () => {
  const sql = await source("supabase/migrations/202609210001_add_password_recovery.sql");
  assert.match(sql, /create table public\.password_recovery_tokens/);
  assert.match(sql, /token_hash text not null unique/);
  assert.doesNotMatch(sql, /raw_token|password text not null/);
  assert.match(sql, /for update/);
  assert.match(sql, /update public\.auth_credentials set password_hash/);
  assert.match(sql, /delete from public\.sessions where user_id = v_user_id/);
  assert.match(sql, /grant execute on function public\.consume_password_recovery_token\(text,text\)\s+to service_role/);
  assert.match(sql, /security definer set search_path = ''/);
  const deliverySql = await source("supabase/migrations/202609210003_require_recovery_delivery.sql");
  assert.match(deliverySql, /add column delivered_at timestamptz/);
  assert.match(deliverySql, /delivered_at is not null/);
  assert.match(deliverySql, /activate_password_recovery_token/);
});

test("failed email delivery invalidates the just-issued hash without changing the public outcome", async () => {
  const invalidated = [];
  const service = load("src/services/auth/password-recovery.service.ts", {
    "@/repositories/users.repository": { usersRepository: { findByEmail: async () => ({ id: "user-1", email: "person@example.test", closed_at: null }) } },
    "@/repositories/password-recovery.repository": { passwordRecoveryRepository: {
      issue: async () => "issued", invalidate: async (hash) => invalidated.push(hash),
      activate: async () => true,
    } },
    "@/libs/email/sender": { getTransactionalEmailSender: () => ({ send: async () => { throw new Error("delivery failed"); } }) },
    "@/libs/siteConfigs": { siteConfigs: { url: "https://example.test" } },
    "@/libs/observability/report": { reportUnexpectedError: () => "safe-id" },
  }).passwordRecoveryService;
  assert.equal(await service.request({ email: "person@example.test" }), undefined);
  assert.equal(invalidated.length, 1);
  assert.match(invalidated[0], /^[0-9a-f]{64}$/);
});

test("activation failure leaves a delivered link unusable and invalidates the issued hash", async () => {
  const invalidated = [];
  const service = load("src/services/auth/password-recovery.service.ts", {
    "@/repositories/users.repository": { usersRepository: { findByEmail: async () => ({ id: "user-1", email: "person@example.test", closed_at: null }) } },
    "@/repositories/password-recovery.repository": { passwordRecoveryRepository: {
      issue: async () => "issued",
      activate: async () => false,
      invalidate: async (hash) => invalidated.push(hash),
    } },
    "@/libs/email/sender": { getTransactionalEmailSender: () => ({ send: async () => {} }) },
    "@/libs/siteConfigs": { siteConfigs: { url: "https://example.test" } },
    "@/libs/observability/report": { reportUnexpectedError: () => "safe-id" },
  }).passwordRecoveryService;
  assert.equal(await service.request({ email: "person@example.test" }), undefined);
  assert.equal(invalidated.length, 1);
  assert.match(invalidated[0], /^[0-9a-f]{64}$/);
});

test("GET inspection is read-only and POST resets without creating a Session", async () => {
  const sql = await source("supabase/migrations/202609210001_add_password_recovery.sql");
  const inspect = sql.split("create function public.inspect_password_recovery_token")[1].split("revoke all privileges")[0];
  assert.doesNotMatch(inspect, /\b(update|delete|insert)\b/i);
  const route = await source("src/app/api/auth/password-recovery/reset/route.ts");
  const openRoute = await source("src/app/api/auth/password-recovery/open/route.ts");
  assert.match(route, /status: 303/);
  assert.match(route, /\/login\?passwordReset=success/);
  assert.match(openRoute, /Referrer-Policy.*no-referrer/);
  assert.match(openRoute, /httpOnly: true/);
  assert.doesNotMatch(openRoute, /\.reset\(|\.consume\(/);
  assert.doesNotMatch(route, /sessionRepository\.create|authService\.login/);
});

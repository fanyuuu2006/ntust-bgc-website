import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { load } from "./helpers/load-app-module.mjs";
const repositoryErrors = load("src/repositories/shared/errors.ts");
const authErrors = load("src/services/auth/auth.errors.tsx");
const closureErrors = load("src/services/auth/account-closure.errors.ts");

function setup({ closed = false, passwordValid = true, rpcError } = {}) {
  const calls = [];
  const user = { id: "user-a", email: "member@example.com", closed_at: closed ? "2026-09-14" : null };
  const mocks = {
    "@/repositories/shared/errors": repositoryErrors,
    "@/repositories/users.repository": { usersRepository: { findByEmail: async () => user, findById: async () => user } },
    "@/repositories/auth.repository": { authRepository: {
      findCredentialByUserId: async () => ({ password_hash: "verified-hash" }),
      closeAccount: async (...args) => { calls.push(args); if (rpcError) throw rpcError; },
    } },
    "@/repositories/sessions.repository": { sessionRepository: {
      findValidByTokenHash: async () => ({ user_id: "user-a", last_accessed_at: new Date().toISOString() }),
      create: async () => { calls.push("session-created"); return {}; },
    } },
    "@/utils/auth/password": { hashPassword: async () => "dummy", verifyPassword: async () => passwordValid },
  };
  return { service: load("src/services/auth/auth.service.tsx", mocks).authService, calls };
}
test("closure requires current password and exact confirmation before RPC", async () => {
  const { service, calls } = setup();
  await assert.rejects(() => service.closeAccount("user-a", "cookie-token", { currentPassword: "", confirmation: "yes" }));
  assert.deepEqual(calls, []);
});

for (const [code, pattern] of [["PCL02", /尚未歸還/], ["PCL01", /Email 或密碼/], ["PCL03", /密碼/]]) {
  test(`closure maps ${code} to an expected domain rejection`, async () => {
    const error = new repositoryErrors.RepositoryError("closure", { code });
    await assert.rejects(() => setup({ rpcError: error }).service.closeAccount("user-a", "cookie-token", { currentPassword: "password", confirmation: "註銷帳號" }), pattern);
  });
}
test("unknown closure failure is not swallowed", async () => {
  const error = new repositoryErrors.RepositoryError("closure", { code: "XX000" });
  await assert.rejects(() => setup({ rpcError: error }).service.closeAccount("user-a", "cookie-token", { currentPassword: "password", confirmation: "註銷帳號" }), value => value === error);
});

function route({ user = { id: "session-owner" }, token = "cookie-token", failure, limited = false } = {}) {
  const calls = [], reports = [];
  const POST = load("src/app/api/users/me/closure/route.ts", {
    "@/libs/auth": { getCurrentUser: async () => user, getSessionTokenFromCookie: async () => token, SESSION_COOKIE_NAME: "bgc_st" },
    "@/services/auth/auth.service": { authService: { closeAccount: async (...args) => { calls.push(args); if (failure) throw failure; } } },
    "@/services/auth/auth.errors": authErrors,
    "@/services/auth/account-closure.errors": closureErrors,
    "@/libs/security/rate-limit": { checkRateLimit: () => ({ allowed: !limited, retryAfter: 60 }) },
    "@/libs/api/server-response": { unexpectedErrorResponse: (...args) => { reports.push(args); return Response.json({ message: "safe", errorId: "reference" }, { status: 500 }); } },
  }).POST;
  return { POST, calls, reports };
}
const request = (body = { currentPassword: "password", confirmation: "註銷帳號" }) => new Request("http://localhost/api/users/me/closure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
test("closure endpoint uses session identity, clears cookie only after successful transaction", async () => {
  const { POST, calls } = route();
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].slice(0, 2), ["session-owner", "cookie-token"]);
  assert.match(response.headers.get("set-cookie"), /bgc_st=;/);
  assert.deepEqual(await response.json(), { data: { success: true } });
});
test("closure requires authentication", async () => {
  const { POST, calls } = route({ user: null });
  assert.equal((await POST(request())).status, 401);
  assert.deepEqual(calls, []);
});
test("closure limits repeated reauthentication attempts", async () => {
  const { POST, calls } = route({ limited: true });
  assert.equal((await POST(request())).status, 429);
  assert.deepEqual(calls, []);
});
test("blocking borrowing is 409 without Error ID or cookie deletion", async () => {
  const { POST, reports } = route({ failure: new closureErrors.AccountClosureBlockedError() });
  const response = await POST(request());
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal((await response.json()).errorId, undefined);
  assert.deepEqual(reports, []);
});
test("wrong password is expected 401 without incident", async () => {
  const { POST, reports } = route({ failure: new authErrors.InvalidCurrentPasswordError() });
  assert.equal((await POST(request())).status, 401);
  assert.deepEqual(reports, []);
});
test("unexpected closure error still reaches the safe boundary exactly once", async () => {
  const { POST, reports } = route({ failure: new Error("private database error") });
  const response = await POST(request());
  assert.equal(response.status, 500);
  assert.equal(reports.length, 1);
  assert.doesNotMatch(await response.text(), /private database/);
});
test("closed account cannot obtain admin rights from officer history", async () => {
  const { isAdminByUserId } = load("src/libs/auth.tsx", {
    "@/repositories/users.repository": { usersRepository: { findById: async () => ({ closed_at: "2026-09-14" }) } },
    "@/services/auth/auth.service": { authService: {} },
    "@/services/officer-positions/officer-positions.service": { officerPositionsService: { hasEverBeenOfficer: async () => { throw new Error("must not authorize history"); } } },
  });
  assert.equal(await isAdminByUserId("closed-user"), false);
});
test("profile payload cannot persist email or verification fields", () => {
  const { updateUserProfileSchema } = load("src/services/users/users.schema.tsx");
  const data = updateUserProfileSchema.parse({ real_name: "Name", phone: "123", email: "attacker@example.com", email_verified_at: "2026-09-14", closed_at: null });
  assert.equal(data.email, undefined);
  assert.equal(data.email_verified_at, undefined);
  assert.equal(data.closed_at, undefined);
});
test("closure reauthenticates and submits cookie token and compared hash, not a client user ID", async () => {
  const { service, calls } = setup();
  await service.closeAccount("user-a", "cookie-token", { currentPassword: "password", confirmation: "註銷帳號" });
  assert.deepEqual(calls, [[load("src/utils/auth/session.tsx").hashSessionToken("cookie-token"), "verified-hash"]]);
});
test("forged identity in closure payload is rejected", async () => {
  const { service, calls } = setup();
  await assert.rejects(() => service.closeAccount("user-a", "cookie-token", { currentPassword: "password", confirmation: "註銷帳號", userId: "victim" }));
  assert.deepEqual(calls, []);
});
test("wrong password never reaches closure RPC", async () => {
  const { service, calls } = setup({ passwordValid: false });
  await assert.rejects(() => service.closeAccount("user-a", "cookie-token", { currentPassword: "wrong", confirmation: "註銷帳號" }), /密碼/);
  assert.deepEqual(calls, []);
});
test("closed user cannot log in even if stale credential is returned", async () => {
  const { service, calls } = setup({ closed: true });
  await assert.rejects(() => service.login({ email: "member@example.com", password: "password" }));
  assert.deepEqual(calls, []);
});
test("stale session for closed user resolves to null", async () => {
  assert.equal(await setup({ closed: true }).service.getUserBySessionToken("old-cookie"), null);
});
test("closure migration retains users and historical records and restricts RPC", () => {
  const sql = readFileSync("supabase/migrations/202609140001_add_account_closure.sql", "utf8");
  for (const table of ["users", "memberships", "officer_positions", "board_game_borrowings", "event_attendances", "announcements"]) {
    assert.doesNotMatch(sql, new RegExp("delete from public\\." + table + "\\b", "i"));
  }
  for (const table of ["user_profiles", "auth_credentials", "sessions", "email_verification_tokens"]) assert.ok(sql.includes("delete from public." + table));
  assert.match(sql, /from public\.sessions/);
  assert.match(sql, /for update/i);
  assert.match(sql, /revoke all on function public\.close_account/);
  assert.match(sql, /to service_role/);
});
test("Admin profile editor accurately names scope and offers no email override", () => {
  const source = readFileSync("src/components/(admin)/admin/users/UserProfileEditButton.tsx", "utf8");
  assert.match(source, /編輯個人資料/);
  assert.doesNotMatch(source, /編輯使用者基本資料|label="Email"|email_verified_at/);
});

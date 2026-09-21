import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import argon2 from "argon2";
import { createClient } from "@supabase/supabase-js";

const DEVELOPMENT_REF = "mrsyfssstigartmhofuz";

function loadLocalEnvironment() {
  const values = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/u)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/gu, "");
  }
  return values;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("Shared Development enforces password recovery transactions and replay safety", {
  skip: process.env.RUN_DEVELOPMENT_INTEGRATION !== "1",
  timeout: 120_000,
}, async () => {
  const environment = loadLocalEnvironment();
  const url = new URL(environment.SUPABASE_URL);
  assert.equal(url.hostname.split(".")[0], DEVELOPMENT_REF);
  assert.ok(environment.SUPABASE_SECRET_KEY, "Development service key is required");

  const client = createClient(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nonce = randomUUID();
  const email = `password-recovery-${nonce}@development.invalid`;
  const oldPassword = randomBytes(24).toString("base64url");
  const oldHash = await argon2.hash(oldPassword);
  let userId;

  try {
    const registered = await client.rpc("register_user", {
      p_email: email,
      p_name: `recovery-${nonce.slice(0, 8)}`,
      p_password_hash: oldHash,
      p_real_name: "Password Recovery QA",
      p_phone: "0000000000",
    });
    assert.ifError(registered.error);
    userId = registered.data.id;

    const verified = await client.from("users")
      .update({ email_verified_at: new Date().toISOString() }).eq("id", userId);
    assert.ifError(verified.error);

    const sessionRows = [digest(`session-a:${nonce}`), digest(`session-b:${nonce}`)].map((tokenHash) => ({
      user_id: userId,
      token: null,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }));
    const sessions = await client.from("sessions").insert(sessionRows);
    assert.ifError(sessions.error);

    const firstRaw = randomBytes(32).toString("base64url");
    const firstHash = digest(firstRaw);
    const expiry = new Date(Date.now() + 3_600_000).toISOString();
    const firstIssue = await client.rpc("issue_password_recovery_token", {
      p_user_id: userId, p_token_hash: firstHash, p_expires_at: expiry,
    });
    assert.ifError(firstIssue.error);
    assert.equal(firstIssue.data, "issued");

    const inactive = await client.rpc("inspect_password_recovery_token", { p_token_hash: firstHash });
    assert.ifError(inactive.error);
    assert.equal(inactive.data, false, "an issued token is unusable until delivery succeeds");
    const activatedFirst = await client.rpc("activate_password_recovery_token", { p_token_hash: firstHash });
    assert.ifError(activatedFirst.error);
    assert.equal(activatedFirst.data, true);

    const inspectedTwice = await Promise.all([
      client.rpc("inspect_password_recovery_token", { p_token_hash: firstHash }),
      client.rpc("inspect_password_recovery_token", { p_token_hash: firstHash }),
    ]);
    for (const result of inspectedTwice) {
      assert.ifError(result.error);
      assert.equal(result.data, true, "inspection must not consume the token");
    }

    const cooldown = await client.rpc("issue_password_recovery_token", {
      p_user_id: userId,
      p_token_hash: digest(randomBytes(32).toString("base64url")),
      p_expires_at: expiry,
    });
    assert.ifError(cooldown.error);
    assert.equal(cooldown.data, "cooldown");

    const ageFirst = await client.from("password_recovery_tokens")
      .update({ created_at: new Date(Date.now() - 61_000).toISOString() })
      .eq("token_hash", firstHash);
    assert.ifError(ageFirst.error);

    const secondRaw = randomBytes(32).toString("base64url");
    const secondHash = digest(secondRaw);
    const secondIssue = await client.rpc("issue_password_recovery_token", {
      p_user_id: userId, p_token_hash: secondHash, p_expires_at: expiry,
    });
    assert.ifError(secondIssue.error);
    assert.equal(secondIssue.data, "issued");
    const activatedSecond = await client.rpc("activate_password_recovery_token", { p_token_hash: secondHash });
    assert.ifError(activatedSecond.error);
    assert.equal(activatedSecond.data, true);

    const superseded = await client.rpc("inspect_password_recovery_token", { p_token_hash: firstHash });
    assert.ifError(superseded.error);
    assert.equal(superseded.data, false);

    const malformed = await client.rpc("inspect_password_recovery_token", { p_token_hash: "malformed" });
    assert.ifError(malformed.error);
    assert.equal(malformed.data, false);
    const unknown = await client.rpc("inspect_password_recovery_token", { p_token_hash: "0".repeat(64) });
    assert.ifError(unknown.error);
    assert.equal(unknown.data, false);

    const expiredHash = digest(randomBytes(32).toString("base64url"));
    const expiredInsert = await client.from("password_recovery_tokens").insert({
      user_id: userId,
      token_hash: expiredHash,
      created_at: new Date(Date.now() - 7_200_000).toISOString(),
      expires_at: new Date(Date.now() - 3_600_000).toISOString(),
    });
    assert.ifError(expiredInsert.error);
    const expired = await client.rpc("inspect_password_recovery_token", { p_token_hash: expiredHash });
    assert.ifError(expired.error);
    assert.equal(expired.data, false);

    const newPassword = randomBytes(24).toString("base64url");
    const newHash = await argon2.hash(newPassword);
    const attempts = await Promise.all([
      client.rpc("consume_password_recovery_token", { p_token_hash: secondHash, p_password_hash: newHash }),
      client.rpc("consume_password_recovery_token", { p_token_hash: secondHash, p_password_hash: newHash }),
    ]);
    for (const result of attempts) assert.ifError(result.error);
    assert.deepEqual(attempts.map((result) => result.data).sort(), ["invalid", "reset"]);

    const credential = await client.from("auth_credentials")
      .select("password_hash").eq("user_id", userId).single();
    assert.ifError(credential.error);
    assert.equal(await argon2.verify(credential.data.password_hash, oldPassword), false);
    assert.equal(await argon2.verify(credential.data.password_hash, newPassword), true);

    const remainingSessions = await client.from("sessions")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);
    assert.ifError(remainingSessions.error);
    assert.equal(remainingSessions.count, 0);

    const replay = await client.rpc("consume_password_recovery_token", {
      p_token_hash: secondHash, p_password_hash: newHash,
    });
    assert.ifError(replay.error);
    assert.equal(replay.data, "invalid");

    const closedUser = await client.from("users").select("id")
      .not("closed_at", "is", null).limit(1).maybeSingle();
    assert.ifError(closedUser.error);
    if (closedUser.data) {
      const closedIssue = await client.rpc("issue_password_recovery_token", {
        p_user_id: closedUser.data.id,
        p_token_hash: digest(randomBytes(32).toString("base64url")),
        p_expires_at: expiry,
      });
      assert.ifError(closedIssue.error);
      assert.equal(closedIssue.data, "ineligible");
    }
  } finally {
    if (userId) {
      await client.from("password_recovery_tokens").delete().eq("user_id", userId);
      await client.from("sessions").delete().eq("user_id", userId);
      await client.from("user_profiles").delete().eq("user_id", userId);
      await client.from("auth_credentials").delete().eq("user_id", userId);
      await client.from("users").delete().eq("id", userId);
    }
  }
});

test("local HTTP recovery flow is scanner-safe, origin-bound, and token-free after GET", {
  skip: process.env.RUN_DEVELOPMENT_HTTP_INTEGRATION !== "1",
  timeout: 120_000,
}, async () => {
  const environment = loadLocalEnvironment();
  const url = new URL(environment.SUPABASE_URL);
  assert.equal(url.hostname.split(".")[0], DEVELOPMENT_REF);
  const client = createClient(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const origin = process.env.RECOVERY_HTTP_ORIGIN ?? "http://localhost:3000";
  const nonce = randomUUID();
  const oldPassword = `Aa1!${randomBytes(18).toString("base64url")}`;
  const newPassword = "Test1234!";
  const oldHash = await argon2.hash(oldPassword);
  let userId;
  let closedUserId;

  try {
    const registered = await client.rpc("register_user", {
      p_email: `password-recovery-http-${nonce}@development.invalid`,
      p_name: `recovery-http-${nonce.slice(0, 8)}`,
      p_password_hash: oldHash,
      p_real_name: "Password Recovery HTTP QA",
      p_phone: "0000000000",
    });
    assert.ifError(registered.error);
    userId = registered.data.id;

    const closedEmail = `closed-${randomUUID()}@account.invalid`;
    const closedUser = await client.from("users").insert({
      name: "已註銷使用者",
      email: closedEmail,
      avatar: null,
      email_verified_at: null,
      closed_at: new Date().toISOString(),
    }).select("id").single();
    assert.ifError(closedUser.error);
    closedUserId = closedUser.data.id;

    const requestRecovery = (email) => fetch(`${origin}/api/auth/password-recovery/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const publicResponses = await Promise.all([
      requestRecovery(`password-recovery-http-${nonce}@development.invalid`),
      requestRecovery(`missing-recovery-http-${nonce}@development.invalid`),
      requestRecovery(closedEmail),
    ]);
    const publicResults = await Promise.all(publicResponses.map(async (response) => ({
      status: response.status,
      body: await response.json(),
    })));
    assert.deepEqual(publicResults[1], publicResults[0]);
    assert.deepEqual(publicResults[2], publicResults[0]);
    assert.equal(publicResults[0].status, 200);

    const ageRequestToken = await client.from("password_recovery_tokens").update({
      created_at: new Date(Date.now() - 61_000).toISOString(),
      consumed_at: new Date().toISOString(),
    }).eq("user_id", userId);
    assert.ifError(ageRequestToken.error);

    const session = await client.from("sessions").insert({
      user_id: userId,
      token: null,
      token_hash: digest(`http-session:${nonce}`),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.ifError(session.error);

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = digest(rawToken);
    const issue = await client.rpc("issue_password_recovery_token", {
      p_user_id: userId,
      p_token_hash: tokenHash,
      p_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    });
    assert.ifError(issue.error);
    assert.equal(issue.data, "issued");
    const activation = await client.rpc("activate_password_recovery_token", { p_token_hash: tokenHash });
    assert.ifError(activation.error);
    assert.equal(activation.data, true);

    const opened = await fetch(`${origin}/api/auth/password-recovery/open?token=${encodeURIComponent(rawToken)}`, {
      redirect: "manual",
    });
    assert.equal(opened.status, 303);
    assert.equal(new URL(opened.headers.get("location")).pathname, "/reset-password");
    assert.doesNotMatch(opened.headers.get("location"), /token=/u);
    assert.equal(opened.headers.get("referrer-policy"), "no-referrer");
    const cookie = opened.headers.get("set-cookie");
    assert.match(cookie, /bgc_pr=/u);
    assert.match(cookie, /HttpOnly/iu);
    assert.match(cookie, /SameSite=Lax/iu);
    assert.match(cookie, /Path=\//iu);
    assert.match(cookie, /Max-Age=3600/iu);
    const cookieHeader = cookie.split(";", 1)[0];

    const resetPage = await fetch(`${origin}/reset-password`, { headers: { cookie: cookieHeader } });
    assert.equal(resetPage.status, 200);
    const resetHtml = await resetPage.text();
    assert.doesNotMatch(resetHtml, new RegExp(rawToken, "u"));
    assert.match(resetHtml, /重設密碼/u);

    const crossSite = await fetch(`${origin}/api/auth/password-recovery/reset`, {
      method: "POST",
      redirect: "manual",
      headers: {
        cookie: cookieHeader,
        origin: "https://attacker.invalid",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ newPassword, confirmPassword: newPassword }),
    });
    assert.equal(crossSite.status, 303);
    assert.equal(new URL(crossSite.headers.get("location")).searchParams.get("result"), "invalid");
    const afterCrossSite = await client.rpc("inspect_password_recovery_token", { p_token_hash: tokenHash });
    assert.ifError(afterCrossSite.error);
    assert.equal(afterCrossSite.data, true);

    const invalidPassword = await fetch(`${origin}/api/auth/password-recovery/reset`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie: cookieHeader, origin, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ newPassword: "short", confirmPassword: "short" }),
    });
    assert.equal(invalidPassword.status, 303);
    assert.equal(new URL(invalidPassword.headers.get("location")).searchParams.get("result"), "password-invalid");
    const afterValidation = await client.rpc("inspect_password_recovery_token", { p_token_hash: tokenHash });
    assert.ifError(afterValidation.error);
    assert.equal(afterValidation.data, true, "validation failure must not consume the token");

    const reset = await fetch(`${origin}/api/auth/password-recovery/reset`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie: cookieHeader, origin, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ newPassword, confirmPassword: newPassword }),
    });
    assert.equal(reset.status, 303);
    assert.equal(new URL(reset.headers.get("location")).pathname, "/login");
    assert.equal(new URL(reset.headers.get("location")).searchParams.get("passwordReset"), "success");
    assert.match(reset.headers.get("set-cookie"), /bgc_pr=;.*Max-Age=0/iu);

    const credential = await client.from("auth_credentials")
      .select("password_hash").eq("user_id", userId).single();
    assert.ifError(credential.error);
    assert.equal(await argon2.verify(credential.data.password_hash, oldPassword), false);
    assert.equal(await argon2.verify(credential.data.password_hash, newPassword), true);
    const sessions = await client.from("sessions")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);
    assert.ifError(sessions.error);
    assert.equal(sessions.count, 0);
  } finally {
    if (userId) {
      await client.from("password_recovery_tokens").delete().eq("user_id", userId);
      await client.from("sessions").delete().eq("user_id", userId);
      await client.from("user_profiles").delete().eq("user_id", userId);
      await client.from("auth_credentials").delete().eq("user_id", userId);
      await client.from("users").delete().eq("id", userId);
    }
    if (closedUserId) await client.from("users").delete().eq("id", closedUserId);
  }
});

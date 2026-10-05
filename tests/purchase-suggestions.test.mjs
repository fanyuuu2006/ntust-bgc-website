import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "./helpers/load-app-module.mjs";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const input = { game_name: "測試桌遊", reason: "這款桌遊很適合社團同學一起遊玩。", reference_url: "", request_id: otherId };
const schema = load("src/services/purchase-suggestions/purchase-suggestions.schema.ts");

test("suggestion schema trims, counts Unicode characters and rejects injected fields", () => {
  assert.equal(schema.createPurchaseSuggestionSchema.parse({ ...input, game_name: "  中文桌遊  " }).game_name, "中文桌遊");
  assert.equal(schema.createPurchaseSuggestionSchema.parse(input).reference_url, null);
  assert.equal(schema.createPurchaseSuggestionSchema.parse({ ...input, game_name: "🎲".repeat(50) }).game_name.length, 100);
  for (const change of [{ game_name: " " }, { game_name: "🎲".repeat(51) }, { reason: "短理由" }, { reason: "文".repeat(201) }, { reason: " ".repeat(30) }, { game_name: "桌遊\n名稱" }, { reason: "合法文字長度足夠但含\u0000控制字" }, { user_id: userId }, { status: "purchased" }, { reviewed_by_user_id: userId }]) {
    assert.equal(schema.createPurchaseSuggestionSchema.safeParse({ ...input, ...change }).success, false, JSON.stringify(change));
  }
  assert.equal(schema.managePurchaseSuggestionSchema.safeParse({ action: "pending", version: 1 }).success, false);
  assert.equal(schema.managePurchaseSuggestionSchema.safeParse({ action: "delete", version: 1, user_id: userId }).success, false);
});

test("new submissions enforce 50/200/100 limits while historical links remain readable", () => {
  const url = "https://example.test/";
  const atLimit = { ...input, game_name: "🎲".repeat(50), reason: "文".repeat(200), reference_url: url + "x".repeat(100 - url.length) };
  assert.equal(schema.createPurchaseSuggestionSchema.safeParse(atLimit).success, true);
  for (const [field, value] of [["game_name", "文".repeat(51)], ["reason", "文".repeat(201)], ["reference_url", atLimit.reference_url + "x"]]) {
    const result = schema.createPurchaseSuggestionSchema.safeParse({ ...atLimit, [field]: value });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].path[0], field);
  }
  assert.equal(schema.referenceUrlSchema.safeParse(url + "x".repeat(150)).success, true);
});

test("reference URL accepts HTTP(S) only and never permits credentials/control characters", () => {
  for (const value of ["https://example.test/game?x=1", "http://example.test/桌遊", ""]) assert.equal(schema.referenceUrlSchema.safeParse(value).success, true);
  for (const value of ["javascript:alert(1)", "data:text/html,x", "//example.test", "https://user:password@example.test", "https://example.test/\npath", "https://example.test\\evil", "https://example.test/" + "x".repeat(500)]) assert.equal(schema.referenceUrlSchema.safeParse(value).success, false, value);
});

test("query pagination rejects unbounded, nonfinite and invalid offsets", () => {
  for (const page of ["Infinity", "NaN", "-1", "999999999", ["2", "3"]]) assert.equal(schema.purchaseSuggestionQuerySchema.parse({ page }).page, 1);
  assert.equal(schema.purchaseSuggestionQuerySchema.parse({ pageSize: "9999" }).pageSize, 20);
  assert.equal(schema.purchaseSuggestionQuerySchema.parse({ pageSize: "50" }).pageSize, 50);
});

test("quota week uses Taipei Monday boundary, including year crossover", () => {
  const { getPurchaseSuggestionWeek } = load("src/utils/purchase-suggestions.ts");
  assert.deepEqual(getPurchaseSuggestionWeek(new Date("2026-09-27T15:59:59Z")), { start: "2026-09-20T16:00:00.000Z", end: "2026-09-27T16:00:00.000Z" });
  assert.deepEqual(getPurchaseSuggestionWeek(new Date("2026-09-27T16:00:00Z")), { start: "2026-09-27T16:00:00.000Z", end: "2026-10-04T16:00:00.000Z" });
  assert.equal(getPurchaseSuggestionWeek(new Date("2027-01-01T00:00:00Z")).start, "2026-12-27T16:00:00.000Z");
});

const http = load("src/libs/api/purchase-suggestion-request.ts", {
  "@/libs/api/server-response": { unexpectedErrorResponse: () => new Response(JSON.stringify({ message: "safe" }), { status: 500 }) },
});
function request(body = "{}", headers = {}) {
  return new NextRequest("https://preview.example.test/api/board-games/suggest", {
    method: "POST", headers: { origin: "https://preview.example.test", "content-type": "application/json", ...headers }, body,
  });
}
test("mutation origin guard works for preview, rejects cross-origin and exact non-JSON types", () => {
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(request()), null);
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(request("{}", { "content-type": "application/json; charset=utf-8" })), null);
  for (const origin of ["null", "https://evil.example.test", "https://example.test"]) assert.equal(http.rejectUnsafePurchaseSuggestionRequest(request("{}", { origin })).status, 403);
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(request("{}", { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(request("{}", { "content-type": "application/jsonx" })).status, 415);
  const noOrigin = request(); noOrigin.headers.delete("origin");
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(noOrigin).status, 403);
});
test("origin guard preserves actual loopback Host and ignores forwarded hosts", () => {
  const local = new NextRequest("http://127.0.0.1:3107/api/board-games/suggest", {
    method: "POST", headers: { host: "127.0.0.1:3107", origin: "http://127.0.0.1:3107", "content-type": "application/json" }, body: "{}",
  });
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(local), null);
  local.headers.set("origin", "http://localhost:3107");
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(local).status, 403);
  const forwarded = request("{}", { host: "preview.example.test", origin: "https://evil.example.test", "x-forwarded-host": "evil.example.test" });
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(forwarded).status, 403);
});

test("actual body size is bounded without Content-Length, even when streamed", async () => {
  assert.deepEqual(await http.readPurchaseSuggestionBody(request(JSON.stringify(input))), input);
  await assert.rejects(http.readPurchaseSuggestionBody(request("x")), (error) => error.status === 400);
  await assert.rejects(http.readPurchaseSuggestionBody(request(JSON.stringify({ text: "中".repeat(6000) }))), (error) => error.status === 413);
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(10000)); controller.enqueue(new Uint8Array(7000)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(http.readPurchaseSuggestionBody(new Request("https://example.test", { method: "POST", body: stream, duplex: "half" })), (error) => error.status === 413);
  assert.equal(cancelled, true);
  assert.equal(http.rejectUnsafePurchaseSuggestionRequest(request("{}", { "content-length": "17000" })).status, 413);
});

function serviceHarness() {
  let user = { id: userId, email_verified_at: "2026-09-01", closed_at: null };
  let admin = false;
  let outcome = { outcome: "received", id: otherId, replayed: false };
  const calls = [];
  const repository = {};
  for (const name of ["submit", "manage", "countForWeek", "listAdmin"]) repository[name] = async (...args) => { calls.push([name, ...args]); return name === "countForWeek" ? 3 : outcome; };
  const { purchaseSuggestionsService: service } = load("src/services/purchase-suggestions/purchase-suggestions.service.ts", {
    "@/libs/auth": { getCurrentUser: async () => user, isAdminByUserId: async () => admin },
    "@/repositories/purchase-suggestions.repository": { purchaseSuggestionsRepository: repository },
  });
  return { service, calls, setUser: (value) => { user = value; }, setAdmin: (value) => { admin = value; }, setOutcome: (value) => { outcome = value; } };
}
test("service obtains identity from Session and blocks missing/unverified/closed users", async () => {
  for (const user of [null, { id: userId, email_verified_at: null }, { id: userId, email_verified_at: "yes", closed_at: "closed" }]) {
    const h = serviceHarness(); h.setUser(user);
    await assert.rejects(h.service.submit(input), (error) => error.status === 403);
    await assert.rejects(h.service.quota(), (error) => error.status === 403);
    assert.equal(h.calls.length, 0);
  }
  const h = serviceHarness(); await h.service.submit(input);
  assert.equal(h.calls[0][1], userId);
  assert.equal(h.calls[0][2].reference_url, null);
  await h.service.quota();
  assert.equal(h.calls[1][1], userId);
});
test("admin service uses existing authorization and strict action schema", async () => {
  const h = serviceHarness();
  await assert.rejects(h.service.listAdmin(), (error) => error.status === 403);
  await assert.rejects(h.service.manage(otherId, { action: "delete", version: 1 }), (error) => error.status === 403);
  h.setAdmin(true); h.setOutcome({ outcome: "updated" });
  await h.service.manage(otherId, { action: "delete", version: 7 });
  assert.deepEqual(h.calls[0], ["manage", userId, otherId, 7, "delete"]);
});
test("business outcomes preserve quota and conflict semantics without database detail", async () => {
  const expected = { cooldown: 429, weekly_limit: 429, duplicate: 409, request_conflict: 409, version_conflict: 409, not_found: 404, forbidden: 403 };
  for (const [outcome, status] of Object.entries(expected)) {
    const h = serviceHarness(); h.setOutcome({ outcome, retry_after: 60 });
    await assert.rejects(h.service.submit(input), (error) => error.status === status && error.retryAfter === 60);
  }
  const h = serviceHarness(); h.setOutcome({ unexpected: "SQL internals" });
  await assert.rejects(h.service.submit(input), /Invalid purchase suggestion database response/);
  assert.equal((await h.service.quota()).remaining, 0);
});
test("POST auth rejects before service/body work and supports replay receipt", async () => {
  let response = new Response("{}", { status: 401 });
  let calls = 0;
  let replayed = false;
  const { POST } = load("src/app/api/board-games/suggest/route.ts", {
    "@/libs/api/verified-authorization": { authorizeVerifiedRequest: async () => ({ response }) },
    "@/libs/api/purchase-suggestion-request": http,
    "@/services/purchase-suggestions/purchase-suggestions.service": { purchaseSuggestionsService: { submit: async () => { calls++; return { id: otherId, replayed }; } } },
  });
  assert.equal((await POST(request())).status, 401); assert.equal(calls, 0);
  response = new Response("{}", { status: 403 });
  assert.equal((await POST(request())).status, 403); assert.equal(calls, 0);
  response = null;
  assert.equal((await POST(request(JSON.stringify(input)))).status, 201);
  replayed = true;
  assert.equal((await POST(request(JSON.stringify(input)))).status, 200);
});

test("PATCH enforces authorization and preserves validation, conflict and safe-error contracts", async () => {
  const { PurchaseSuggestionError } = load("src/services/purchase-suggestions/purchase-suggestions.errors.ts");
  const handlerHttp = load("src/libs/api/purchase-suggestion-request.ts", {
    "@/services/purchase-suggestions/purchase-suggestions.errors": { PurchaseSuggestionError },
    "@/libs/api/server-response": { unexpectedErrorResponse: () => new Response(JSON.stringify({ message: "safe", errorId: otherId }), { status: 500 }) },
  });
  let response = new Response("{}", { status: 401 });
  let failure = null;
  const calls = [];
  const { PATCH } = load("src/app/api/admin/board-games/suggests/[id]/route.ts", {
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => ({ response }) },
    "@/libs/api/purchase-suggestion-request": handlerHttp,
    "@/services/purchase-suggestions/purchase-suggestions.service": { purchaseSuggestionsService: { manage: async (id, body) => {
      calls.push([id, body]);
      schema.managePurchaseSuggestionSchema.parse(body);
      if (failure) throw failure;
      return { updated: true };
    } } },
  });
  const send = (body = { action: "purchased", version: 1 }) => PATCH(new NextRequest(`https://preview.example.test/api/admin/board-games/suggests/${otherId}`, {
    method: "PATCH", headers: { origin: "https://preview.example.test", "content-type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: otherId }) });
  for (const status of [401, 403]) {
    response = new Response("{}", { status });
    assert.equal((await send()).status, status);
    assert.equal(calls.length, 0);
  }
  response = null;
  const success = await send();
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), { data: { updated: true } });
  assert.deepEqual(calls[0], [otherId, { action: "purchased", version: 1 }]);
  const invalid = await send({ action: "pending", version: 0 });
  assert.equal(invalid.status, 400);
  const invalidBody = await invalid.json();
  assert.ok(Array.isArray(invalidBody.errors.action));
  assert.ok(Array.isArray(invalidBody.errors.version));
  failure = new PurchaseSuggestionError("紀錄已變更", 409);
  const conflict = await send();
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).message, "紀錄已變更");
  failure = new Error("private SQL detail");
  const unexpected = await send();
  assert.equal(unexpected.status, 500);
  assert.deepEqual(await unexpected.json(), { message: "safe", errorId: otherId });
});

test("repository hides deleted records, counts deleted quota and bounds admin pages", async () => {
  const calls = [];
  const chain = new Proxy({}, { get: (_, method) => method === "then"
    ? (resolve) => resolve({ data: [], count: 0, error: null })
    : (...args) => { calls.push([method, ...args]); return chain; } });
  const { purchaseSuggestionsRepository: repository } = load("src/repositories/purchase-suggestions.repository.ts", {
    "@/libs/supabase/server": { supabase: { from: (table) => { calls.push(["from", table]); return chain; } } },
  });
  await repository.listAdmin({ page: 1, pageSize: 9999, status: "all" });
  assert.ok(calls.some((call) => call[0] === "is" && call[1] === "deleted_at" && call[2] === null));
  assert.ok(calls.some((call) => call[0] === "range" && call[1] === 0 && call[2] === 49));
  calls.length = 0;
  await repository.countForWeek(userId, "start", "end");
  assert.equal(calls.some((call) => call[1] === "deleted_at" || call[1] === "status"), false);
});

test("plain-text rendering escapes HTML and refuses malicious stored reference URLs", () => {
  const { PurchaseSuggestionList } = load("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionList.tsx", { "@/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionActions": { PurchaseSuggestionActions: () => null }, "next/navigation": { useRouter: () => ({ refresh() {} }) } });
  const item = { id: otherId, game_name: "<img src=x onerror=alert(1)>", reason: "<script>alert(1)</script>", reference_url: "javascript:alert(1)", created_at: "2026-09-30T00:00:00Z", status: "pending" };
  const html = renderToStaticMarkup(createElement(PurchaseSuggestionList, { items: [item] }));
  assert.doesNotMatch(html, /<script|<img|javascript:/);
  assert.match(html, /&lt;script&gt;/);
  const linked = renderToStaticMarkup(createElement(PurchaseSuggestionList, { items: [{ ...item, reference_url: "https://example.test/game" }] }));
  assert.match(linked, /noopener noreferrer/);
});

test("migration declares DB-backed writes; only SQL integration proves runtime concurrency", () => {
  const sql = readFileSync("supabase/migrations/202609300001_add_board_game_purchase_suggestions.sql", "utf8");
  assert.match(sql, /revoke all on table public\.board_game_purchase_suggestions from public, anon, authenticated, service_role/);
  assert.match(sql, /unique\(user_id, request_id\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /date_trunc\('week', v_now at time zone 'Asia\/Taipei'\)/);
  assert.match(sql, /purchase_notice_read_version = greatest\(purchase_notice_read_version, p_notice_version\)/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete|all).*to service_role/i);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

import { load } from "./helpers/load-app-module.mjs";

const { NextRequest } = createRequire(import.meta.url)("next/server");

const managerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const user = (id = managerId, overrides = {}) => ({ id, closed_at: null, email_verified_at: "2026-09-01T00:00:00Z", ...overrides });

test("Support Manager is a separate, fail-closed server-only UUID capability", () => {
  const { configuredSupportManagerId, isSupportManager } = load("src/libs/support-manager.ts", {
    "@/libs/auth": { getCurrentUser: async () => null },
  });
  assert.equal(configuredSupportManagerId(""), null);
  assert.equal(configuredSupportManagerId("not-an-id"), null);
  assert.equal(configuredSupportManagerId(` ${managerId.toUpperCase()} `), managerId);
  assert.equal(isSupportManager(null, managerId), false);
  assert.equal(isSupportManager(user(otherId), managerId), false);
  assert.equal(isSupportManager(user(managerId, { closed_at: "2026-09-10T00:00:00Z" }), managerId), false);
  assert.equal(isSupportManager(user(managerId, { email_verified_at: null }), managerId), false);
  assert.equal(isSupportManager(user(managerId), null), false);
  assert.equal(isSupportManager(user(managerId), managerId), true);
});

test("API authorization rejects anonymous, ordinary user and Club Admin but accepts configured manager", async () => {
  let currentUser = null;
  const { authorizeSupportManagerRequest } = load("src/libs/api/support-manager-authorization.ts", {
    "@/libs/auth": { getCurrentUser: async () => currentUser },
    "@/libs/support-manager": { isSupportManager: (candidate) => Boolean(candidate && candidate.id === managerId && !candidate.closed_at && candidate.email_verified_at) },
  });
  assert.equal((await authorizeSupportManagerRequest()).response.status, 401);
  currentUser = user(otherId);
  assert.equal((await authorizeSupportManagerRequest()).response.status, 403);
  currentUser = user(otherId, { isAdmin: true });
  assert.equal((await authorizeSupportManagerRequest()).response.status, 403);
  currentUser = user(managerId, { email_verified_at: null });
  assert.equal((await authorizeSupportManagerRequest()).response.status, 403);
  currentUser = user(managerId);
  assert.equal((await authorizeSupportManagerRequest()).response, null);
});

test("private mutation requires exact same Origin and JSON", () => {
  const { rejectUnsafeSupportMutation } = load("src/libs/api/support-manager-mutation.ts");
  const request = (origin, contentType = "application/json") => new NextRequest("https://example.test/api/support/manage", {
    method: "POST", headers: { origin, "content-type": contentType }, body: "{}",
  });
  assert.equal(rejectUnsafeSupportMutation(request("https://evil.test")).status, 403);
  assert.equal(rejectUnsafeSupportMutation(request(null)).status, 403);
  assert.equal(rejectUnsafeSupportMutation(request("https://example.test", "text/plain")).status, 415);
  assert.equal(rejectUnsafeSupportMutation(request("https://example.test")), null);
});

test("support service separates manual verification, consent, publication, withdrawal and refund", async () => {
  const calls = [];
  const record = { id: managerId };
  const repository = {
    createVerified: async (input) => { calls.push(["create", input]); return record; },
    updateConsent: async (id, input) => { calls.push(["consent", id, input]); return record; },
    publish: async (id) => { calls.push(["publish", id]); return record; },
    withdraw: async (id) => { calls.push(["withdraw", id]); return record; },
    markRefunded: async (id) => { calls.push(["refund", id]); return record; },
  };
  const { supportService } = load("src/services/support/support.service.ts", {
    "@/repositories/support.repository": { supportRepository: repository },
  });
  await supportService.createVerified({ provider: " QA ", providerTransactionReference: " tx-1 ", paidAt: "2026-09-01T10:00" });
  assert.deepEqual(calls[0], ["create", { provider: "qa", reference: "tx-1", paidAt: "2026-09-01T02:00:00.000Z" }]);
  await supportService.update(managerId, { action: "recordConsent", displayName: " 中文 🧋 ", consentMethod: "平台私訊" });
  assert.equal(calls[1][2].name, "中文 🧋");
  await supportService.update(managerId, { action: "publish" });
  await supportService.update(managerId, { action: "withdraw" });
  await supportService.update(managerId, { action: "refund" });
  assert.deepEqual(calls.map((entry) => entry[0]), ["create", "consent", "publish", "withdraw", "refund"]);
  await assert.rejects(() => supportService.createVerified({ provider: "QA", providerTransactionReference: "tx", paidAt: "2099-01-01T10:00" }));
  await assert.rejects(() => supportService.createVerified({ provider: "QA", providerTransactionReference: "tx", paidAt: "2026-02-30T10:00" }));
});

test("duplicate platform transaction is rejected without leaking its reference in the error", async () => {
  const query = {
    insert() { return this; },
    select() { return this; },
    single: async () => ({ data: null, error: { code: "23505", message: "Key (provider_transaction_reference)=(PRIVATE-123) already exists" } }),
  };
  const { supportRepository } = load("src/repositories/support.repository.ts", {
    "@/libs/supabase/server": { supabase: { from: () => query } },
  });
  await assert.rejects(
    () => supportRepository.createVerified({ provider: "qa", reference: "PRIVATE-123", paidAt: "2026-09-01T00:00:00Z" }),
    (error) => error.constructor.name === "DuplicateSupportReferenceError" && !String(error).includes("PRIVATE-123"),
  );
});

test("private management UI keeps payment evidence inside management and separates consent from publishing", () => {
  const { ManageSupportRecordModal, SupportManagePanel } = load("src/components/(public)/support/SupportManagePanel.tsx", {
    "@/libs/api/client": { apiClient: async () => { throw new Error("unused"); } },
  });
  const record = {
    id: managerId, provider: "qa", provider_transaction_reference: "PRIVATE-123",
    payment_status: "paid", paid_at: "2026-09-01T00:00:00Z",
    public_display_name: null, public_consent_at: null, public_consent_method: null,
    published_at: null, withdrawn_at: null, created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
  const collection = renderToStaticMarkup(React.createElement(SupportManagePanel, { initialRecords: [record] }));
  const management = renderToStaticMarkup(React.createElement(ManageSupportRecordModal, {
    record,
    onClose: () => {},
    onSaved: () => {},
  }));
  assert.doesNotMatch(collection, /PRIVATE-123/);
  assert.match(management, /PRIVATE-123/);
  assert.match(management, /付款不代表同意公開/);
  assert.match(management, /紀錄公開同意/);
  const managementDocument = new JSDOM(management).window.document;
  const managementActions = [...(managementDocument.querySelector("dialog")?.querySelectorAll("button") ?? [])]
    .map((button) => button.textContent);
  assert.ok(!managementActions.includes("公開"));
  assert.ok(!managementActions.includes("撤下公開"));
});

test("support record presentation derives one deterministic management status", () => {
  const { getSupportRecordStatus } = load(
    "src/components/(public)/support/support-record-status.ts",
  );
  const base = {
    payment_status: "paid",
    public_display_name: null,
    public_consent_at: null,
    published_at: null,
    withdrawn_at: null,
  };

  assert.equal(getSupportRecordStatus(base), "awaiting-consent");
  assert.equal(getSupportRecordStatus({ ...base, public_display_name: "小明", public_consent_at: "2026-09-01T00:00:00Z" }), "ready-to-publish");
  assert.equal(getSupportRecordStatus({ ...base, public_display_name: "小明", public_consent_at: "2026-09-01T00:00:00Z", published_at: "2026-09-02T00:00:00Z" }), "published");
  assert.equal(getSupportRecordStatus({ ...base, withdrawn_at: "2026-09-03T00:00:00Z" }), "withdrawn");
  assert.equal(getSupportRecordStatus({ ...base, payment_status: "refunded", withdrawn_at: "2026-09-03T00:00:00Z" }), "refunded");
});

test("support management follows the existing admin collection and dialog grammar", () => {
  const { ManageSupportRecordModal, SupportManagePanel } = load("src/components/(public)/support/SupportManagePanel.tsx", {
    "@/libs/api/client": { apiClient: async () => { throw new Error("unused"); } },
  });
  const record = {
    id: managerId, provider: "buymeacoffee", provider_transaction_reference: "PRIVATE-123",
    payment_status: "paid", paid_at: "2026-09-01T00:00:00Z",
    public_display_name: null, public_consent_at: null, public_consent_method: null,
    published_at: null, withdrawn_at: null, created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(SupportManagePanel, { initialRecords: [record] })));
  const document = dom.window.document;

  assert.match(document.querySelector("h1")?.textContent ?? "", /支持紀錄管理/);
  assert.ok([...document.querySelectorAll("button")].some((button) => button.textContent.includes("新增已核對支持")));
  assert.deepEqual(
    [...document.querySelectorAll("select option")].map((option) => option.textContent),
    ["全部", "待取得同意", "待發布", "已公開", "已撤下", "已退款"],
  );
  assert.deepEqual(
    [...document.querySelectorAll("table th")].map((cell) => cell.textContent),
    ["平台", "付款時間", "公開暱稱", "狀態", "操作"],
  );
  assert.doesNotMatch(document.querySelector("table")?.textContent ?? "", /PRIVATE-123/);
  const management = new JSDOM(renderToStaticMarkup(React.createElement(ManageSupportRecordModal, {
    record,
    onClose: () => {},
    onSaved: () => {},
  }))).window.document;
  assert.match([...management.querySelectorAll("dialog")].map((dialog) => dialog.textContent).join(" "), /PRIVATE-123/);
  assert.equal(management.querySelectorAll('input[type="checkbox"]').length, 1);
  assert.doesNotMatch(readFileSync("src/components/(public)/support/SupportManagePanel.tsx", "utf8"), /window\.confirm/);
});

test("private API denies unauthorized callers before touching records", async () => {
  let calls = 0;
  const route = load("src/app/api/support/manage/route.ts", {
    "@/libs/api/support-manager-authorization": {
      authorizeSupportManagerRequest: async () => ({ user: null, response: new Response("denied", { status: 403 }) }),
    },
    "@/services/support/support.service": { supportService: { listPrivate: async () => { calls += 1; return []; }, createVerified: async () => { calls += 1; } } },
  });
  assert.equal((await route.GET()).status, 403);
  assert.equal((await route.POST(new NextRequest("https://example.test/api/support/manage", {
    method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: "{}",
  }))).status, 403);
  assert.equal(calls, 0);
});

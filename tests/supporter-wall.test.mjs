import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const source = (path) => readFileSync(path, "utf8");

test("support payment URL accepts only configured absolute HTTPS destinations", () => {
  const { configuredSupportPaymentUrl } = load("src/libs/support-payment.ts");

  assert.equal(configuredSupportPaymentUrl(), null);
  assert.equal(configuredSupportPaymentUrl(""), null);
  assert.equal(configuredSupportPaymentUrl("   "), null);
  assert.equal(configuredSupportPaymentUrl("not-a-url"), null);
  assert.equal(configuredSupportPaymentUrl("http://payments.example.test/support"), null);
  assert.equal(
    configuredSupportPaymentUrl("  https://payments.example.test/support  "),
    "https://payments.example.test/support",
  );
});

test("public support query selects only names and filters payment, consent, publication and withdrawal", async () => {
  const calls = [];
  const query = {
    select(fields) { calls.push(["select", fields]); return this; },
    eq(field, value) { calls.push(["eq", field, value]); return this; },
    not(field, operator, value) { calls.push(["not", field, operator, value]); return this; },
    is(field, value) { calls.push(["is", field, value]); return this; },
    order(field, options) { calls.push(["order", field, options]); return this; },
    limit(value) { calls.push(["limit", value]); return Promise.resolve({ data: [{ public_display_name: "支持者 🧋" }], error: null }); },
  };
  const { supportRepository } = load("src/repositories/support.repository.ts", {
    "@/libs/supabase/server": { supabase: { from(table) { calls.push(["from", table]); return query; } } },
  });
  assert.deepEqual(await supportRepository.listPublicSupporters(), [{ public_display_name: "支持者 🧋" }]);
  assert.deepEqual(calls.slice(0, 6), [
    ["from", "support_records"],
    ["select", "public_display_name"],
    ["eq", "payment_status", "paid"],
    ["not", "public_consent_at", "is", null],
    ["not", "public_display_name", "is", null],
    ["not", "published_at", "is", null],
  ]);
  assert.ok(calls.some((call) => call[0] === "is" && call[1] === "withdrawn_at"));
  assert.ok(calls.some((call) => call[0] === "limit" && call[1] === 200));
  assert.ok(!JSON.stringify(calls).includes("provider_transaction_reference"));
});

test("public service maps the narrow projection only", async () => {
  const { supportService } = load("src/services/support/support.service.ts", {
    "@/repositories/support.repository": { supportRepository: { listPublicSupporters: async () => [
      { public_display_name: "小明", provider: "private", provider_transaction_reference: "secret" },
    ] } },
  });
  assert.deepEqual(await supportService.listPublicSupporters(), [{ displayName: "小明" }]);
});

test("display names allow Unicode and reject blank, long and control text", () => {
  const { publicDisplayNameSchema } = load("src/services/support/support.schema.ts");
  assert.equal(publicDisplayNameSchema.parse("  飯魚 🧋  "), "飯魚 🧋");
  for (const name of ["   ", "a".repeat(41), "abc\nxyz", "abc\u200Bxyz"]) {
    assert.equal(publicDisplayNameSchema.safeParse(name).success, false);
  }
});

test("wall renders the shared compact empty state and equal-weight acknowledgement tiles", () => {
  const { SupporterWall } = load("src/components/(public)/support/SupporterWall.tsx");
  const empty = renderToStaticMarkup(React.createElement(SupporterWall, { supporters: [] }));
  assert.match(empty, /目前沒有公開的支持者名單/);
  assert.doesNotMatch(empty, /0 位/);
  assert.doesNotMatch(empty, /<li/);
  const full = renderToStaticMarkup(React.createElement(SupporterWall, {
    supporters: [{ displayName: "中文 🧋" }, { displayName: "<script>alert(1)</script>" }, { displayName: "VeryLongName".repeat(7) }],
  }));
  assert.equal((full.match(/<li/g) ?? []).length, 3);
  assert.match(full, /謝謝每一位願意支持本站的人/);
  assert.match(full, /&lt;script&gt;/);
  assert.doesNotMatch(full, /<script>/);
  assert.doesNotMatch(full, /Supporter Wall|<svg/);
  assert.match(full, /aria-label="支持本站的朋友"/);
});

test("schema keeps private records inaccessible to browser roles and prevents duplicate references", () => {
  const sql = source("supabase/migrations/202609220001_add_support_records.sql");
  assert.match(sql, /unique \(provider, provider_transaction_reference\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all privileges on table public\.support_records from public, anon, authenticated/);
  assert.match(sql, /grant select, insert, update, delete on table public\.support_records to service_role/);
  assert.doesNotMatch(sql, /email|user_id|amount|currency|card_number|raw_payload/i);
});

test("public route follows the public-page hierarchy and keeps clarification secondary", async () => {
  const { metadata, default: SupportPage } = load("src/app/(public)/support/page.tsx", {
    "@/libs/support-payment": { configuredSupportPaymentUrl: () => null },
    "@/services/support/support.service": { supportService: { listPublicSupporters: async () => [] } },
  });
  assert.equal(metadata.alternates.canonical, "/support");
  assert.equal(metadata.title, "支持本站持續經營");
  const html = renderToStaticMarkup(await SupportPage());
  assert.match(html, /網站從開發、維護到持續改善/);
  assert.match(html, /如果本站曾經幫上忙/);
  assert.match(html, /請開發者喝杯飲料 🧋/);
  assert.match(html, /disabled/);
  assert.match(html, /支持方式準備中/);
  assert.match(html, /支持款項由網站開發者個人收取/);
  assert.match(html, /並非臺科大或桌遊社的社費、捐款或社團收入/);
  assert.match(html, /關於支持本站/);
  assert.match(html, /不影響網站功能、社員資格或其他社團權益/);
  assert.doesNotMatch(html, /一起讓網站慢慢變得更好|<svg/);
  assert.doesNotMatch(html, /href="https?:\/\//);
  assert.ok(source("src/components/Footer/Footer.tsx").includes('href: "/support"'));
  assert.ok(source("src/app/sitemap.ts").includes('"/support"'));
});

test("public route enables the canonical CTA only for a valid configured payment URL", async () => {
  const { default: SupportPage } = load("src/app/(public)/support/page.tsx", {
    "@/libs/support-payment": { configuredSupportPaymentUrl: () => "https://payments.example.test/support" },
    "@/services/support/support.service": { supportService: { listPublicSupporters: async () => [] } },
  });

  const html = renderToStaticMarkup(await SupportPage());
  assert.match(html, /href="https:\/\/payments\.example\.test\/support"/);
  assert.match(html, /請開發者喝杯飲料 🧋/);
  assert.doesNotMatch(html, /disabled/);
  assert.doesNotMatch(html, /支持方式準備中/);
});

test("public route remains unavailable when payment configuration is invalid or missing", async () => {
  for (const configuredValue of [null, undefined]) {
    const { default: SupportPage } = load("src/app/(public)/support/page.tsx", {
      "@/libs/support-payment": { configuredSupportPaymentUrl: () => configuredValue },
      "@/services/support/support.service": { supportService: { listPublicSupporters: async () => [] } },
    });

    const html = renderToStaticMarkup(await SupportPage());
    assert.match(html, /disabled/);
    assert.match(html, /支持方式準備中/);
    assert.doesNotMatch(html, /href="https?:\/\//);
  }
});

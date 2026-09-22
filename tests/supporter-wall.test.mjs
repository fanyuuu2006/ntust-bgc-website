import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const source = (path) => readFileSync(path, "utf8");

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

test("wall renders a restrained zero state and equal-weight literal supporter tiles", () => {
  const { SupporterWall } = load("src/components/(public)/support/SupporterWall.tsx");
  const empty = renderToStaticMarkup(React.createElement(SupporterWall, { supporters: [] }));
  assert.match(empty, /目前還沒有公開的支持者/);
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

test("public route centers the support action and keeps detailed clarification secondary", async () => {
  const { metadata, default: SupportPage } = load("src/app/(public)/support/page.tsx", {
    "@/services/support/support.service": { supportService: { listPublicSupporters: async () => [] } },
  });
  assert.equal(metadata.alternates.canonical, "/support");
  assert.equal(metadata.title, "支持本站持續經營");
  const html = renderToStaticMarkup(await SupportPage());
  assert.match(html, /請開發者喝杯飲料 🧋/);
  assert.match(html, /disabled/);
  assert.match(html, /支持方式準備中/);
  assert.match(html, /由網站開發者個人收取，並非社費或社團收入/);
  assert.match(html, /關於支持本站/);
  assert.match(html, /不影響網站功能、社員資格或任何社團權益/);
  assert.doesNotMatch(html, /一起讓網站慢慢變得更好|<svg/);
  assert.doesNotMatch(html, /href="https?:\/\//);
  assert.ok(source("src/components/Footer/Footer.tsx").includes('href: "/support"'));
  assert.ok(source("src/app/sitemap.ts").includes('"/support"'));
});

// These existing tests exercise the production-safe contract explicitly.
process.env.NODE_ENV = "production";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "./helpers/load-app-module.mjs";

const readSource = path => readFile(new URL("../" + path, import.meta.url), "utf8");
test("global error owns a self-contained accessible document fallback", async () => {
  const source = await readSource("src/app/global-error.tsx");
  const { default: GlobalError } = load("src/app/global-error.tsx");
  const id = crypto.randomUUID();
  const html = renderToStaticMarkup(React.createElement(GlobalError, {
    error: Object.assign(new Error("private server detail"), { digest: "app-error:" + id }), reset() {},
  }));
  assert.match(html, /<html lang="zh-Hant"/);
  assert.match(html, /<body/); assert.match(html, /<main/);
  assert.match(html, /網站暫時發生問題/); assert.match(html, /再試一次/); assert.match(html, /回首頁/);
  assert.ok(html.includes(id)); assert.match(html, /複製追蹤碼/);
  assert.doesNotMatch(html, /private server detail|app-error:/);
  assert.match(source, /^"use client";/);
  assert.doesNotMatch(source, /RootLayout|WebsiteShell|UserProvider|getCurrentUser|supabase|repositories?\//i);
  assert.doesNotMatch(source, /error\.(?:message|stack|digest)/);
});
test("authenticated segment error boundary remains available", async () => {
 const source = await readSource("src/app/(authenticated)/error.tsx");
 assert.match(source, /^"use client";/); assert.match(source, /reset/); assert.match(source, /UnexpectedErrorState/);
});

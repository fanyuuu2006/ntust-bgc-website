import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("public review identity bounds a long author name without shrinking the avatar", () => {
  const { PublicUserLink } = load("src/components/PublicUserLink.tsx");
  const longName = "超長公開使用者名稱".repeat(20);
  const html = renderToStaticMarkup(createElement(PublicUserLink, {
    identity: {
      id: "11111111-1111-4111-8111-111111111111",
      name: longName,
      avatar: null,
      closed_at: null,
    },
  }));

  assert.match(html, /min-w-0/);
  assert.match(html, /truncate/);
  assert.match(html, /shrink-0/);
  assert.match(html, new RegExp(`title="${longName}"`));
});

test("admin user list delegates desktop and mobile identity overflow to the shared contract", async () => {
  const usersPage = await source("src/app/(admin)/admin/users/page.tsx");

  assert.match(usersPage, /<AdminUserIdentity/);
  assert.match(usersPage, /variant="mobile"/);
  assert.match(usersPage, /<TableCell className="w-64 max-w-64 min-w-0">/);
  assert.doesNotMatch(usersPage, /<div className="min-w-0 wrap-anywhere">\s*<p className="font-medium">\{user\.name\}/);
});

test("officer titles are bounded independently from year and action columns", async () => {
  const officers = await source("src/components/(admin)/admin/officers/OfficerRecords.tsx");

  assert.match(officers, /<TableCell className="w-56 max-w-56 min-w-0">\s*<p className="truncate" title=\{officer\.title\}>/);
  assert.match(officers, /line-clamp-2 wrap-anywhere/);
  assert.match(officers, /<TableCell className="whitespace-nowrap">\{officer\.academic_year/);
  assert.match(officers, /<TableCell className="whitespace-nowrap text-right">/);
});

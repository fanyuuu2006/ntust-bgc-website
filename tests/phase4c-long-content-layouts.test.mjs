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

test("membership table bounds long user identity without compressing semantic columns", async () => {
  const memberships = await source(
    "src/components/(admin)/admin/memberships/MembershipRecords.tsx",
  );

  assert.match(memberships, /<AdminListSection className="hidden lg:block">/);
  assert.match(memberships, /<Table className="min-w-\[1168px\]">/);
  assert.match(memberships, /<TableCell className="w-64 max-w-64 min-w-0">\s*<AdminUserLink/);
  assert.match(memberships, /<TableHead className="w-24 whitespace-nowrap">類型<\/TableHead>/);
  assert.match(memberships, /<TableHead className="w-28 whitespace-nowrap">學年度<\/TableHead>/);
  assert.match(memberships, /className="w-28 whitespace-nowrap"/);
  assert.equal((memberships.match(/className="w-44 whitespace-nowrap"/g) ?? []).length, 2);
  assert.match(memberships, /<TableHead className="w-36 whitespace-nowrap text-right">操作<\/TableHead>/);
  assert.match(memberships, /<TableCell className="whitespace-nowrap text-right">/);
  assert.match(memberships, /<div className="grid gap-3 lg:hidden">/);
});

test("officer titles are bounded independently from year and action columns", async () => {
  const officers = await source("src/components/(admin)/admin/officers/OfficerRecords.tsx");

  assert.match(officers, /<TableCell className="w-56 max-w-56 min-w-0">\s*<p className="truncate" title=\{officer\.title\}>/);
  assert.match(officers, /line-clamp-2 wrap-anywhere/);
  assert.match(officers, /<TableCell className="whitespace-nowrap">\{officer\.academic_year/);
  assert.match(officers, /<TableCell className="whitespace-nowrap text-right">/);
});

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

  const linkClasses = html.match(/^<a class="([^"]+)"/)?.[1].split(" ") ?? [];
  assert.match(html, /min-w-0/);
  assert.ok(linkClasses.includes("inline-flex"));
  assert.ok(!linkClasses.some((className) => ["flex", "flex-1", "grow", "w-full"].includes(className)));
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
  assert.match(memberships, /<div className="grid gap-2\.5 lg:hidden">/);
});

test("officer titles are bounded independently from year and action columns", async () => {
  const officers = await source("src/components/(admin)/admin/officers/OfficerRecords.tsx");

  assert.match(officers, /<TableCell className="w-56 max-w-56 min-w-0">\s*<p className="truncate" title=\{officer\.title\}>/);
  assert.match(officers, /line-clamp-2 wrap-anywhere/);
  assert.match(officers, /<TableCell className="whitespace-nowrap">\{officer\.academic_year/);
  assert.match(officers, /<TableCell className="whitespace-nowrap text-right">/);
});

test("admin board-game table bounds long names without compressing semantic columns", async () => {
  const boardGames = await source(
    "src/components/(admin)/admin/board-games/BoardGameTable.tsx",
  );

  assert.match(boardGames, /<AdminListSection className="hidden xl:block">/);
  assert.match(boardGames, /<Table className="min-w-\[1040px\] table-fixed">/);
  assert.match(boardGames, /<col className="w-12" \/>[\s\S]*<col className="w-72" \/>[\s\S]*<col className="w-40" \/>/);
  assert.match(boardGames, /<BoardGameImage[\s\S]*className="size-10 shrink-0/);
  assert.match(boardGames, /<AdminBoardGameLink[\s\S]*className="min-w-0 line-clamp-2"[\s\S]*title=\{game\.name\}/);
  assert.match(boardGames, /<TableCell className="whitespace-nowrap">[\s\S]*<BoardGameStatusBadge/);
  assert.match(boardGames, /<TableCell className="whitespace-nowrap text-right">[\s\S]*<BoardGameRowActions/);
  assert.match(boardGames, /<div className="grid min-w-0 max-w-full gap-3 xl:hidden">/);
  assert.match(boardGames, /<h2 className="wrap-anywhere font-semibold">/);
});

test("admin board-game name links retain complete long labels and destinations", () => {
  const { AdminBoardGameLink } = load(
    "src/components/(admin)/admin/AdminBoardGameLink.tsx",
  );
  const names = [
    "超長中文桌遊名稱".repeat(12),
    "A very long English board game name ".repeat(10).trim(),
    "UnbrokenBoardGameName".repeat(20),
    "一般桌遊",
  ];

  for (const name of names) {
    const html = renderToStaticMarkup(
      createElement(
        AdminBoardGameLink,
        {
          boardGameId: "11111111-1111-4111-8111-111111111111",
          className: "min-w-0 line-clamp-2",
          title: name,
        },
        name,
      ),
    );

    assert.match(html, /href="\/admin\/board-games\/11111111-1111-4111-8111-111111111111\/edit"/);
    assert.match(html, /class="[^"]*wrap-anywhere[^"]*line-clamp-2/);
    assert.ok(html.includes(`title="${name}"`));
    assert.ok(html.includes(name));
  }
});

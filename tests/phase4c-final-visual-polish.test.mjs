import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("generated register keys occupy the content flow instead of the heading action row", async () => {
  const [page, form] = await Promise.all([
    source("src/app/(admin)/admin/memberships/register-keys/page.tsx"),
    source("src/components/(admin)/admin/memberships/RegisterKeyGenerateForm.tsx"),
  ]);

  assert.match(page, /actions=\{\s*<ButtonLink[\s\S]*?<\/ButtonLink>\s*\}/);
  assert.ok(page.indexOf("<RegisterKeyGenerateForm") > page.indexOf("<section className="));
  assert.match(page, /<RegisterKeyGenerateForm[\s\S]*<RegisterKeyFilterBar/);
  assert.match(form, /已產生 \{generatedKeys\.length\} 組社員註冊序號/);
  assert.match(form, /複製全部/);
  assert.match(form, /max-h-48 overflow-auto/);
  assert.match(form, /w-full min-w-0/);
});

test("discovery cards keep category and code together above a bounded location row", async () => {
  const card = await source("src/components/(public)/board-games/BoardGameCard.tsx");

  assert.doesNotMatch(card, /metadata\.join/);
  assert.match(card, /boardGame\.category\?\.name/);
  assert.match(card, /#\s*\{boardGame\.inventory_number\}/);
  assert.match(card, /boardGame\.location\?\.name/);
  assert.match(card, /truncate/);
  assert.match(card, /min-h-5/);
  assert.match(card, /flex min-w-0 flex-1 flex-col/);
  assert.match(card, /mt-auto[^"\n]*pt-3[^>]*>[\s\S]*查看詳情/);
});

test("homepage preview remains a deliberately separate compact card composition", async () => {
  const [discovery, home] = await Promise.all([
    source("src/components/(public)/board-games/BoardGameCard.tsx"),
    source("src/components/(public)/home/HomeBoardGamePreview.tsx"),
  ]);

  assert.match(discovery, /inventory_number/);
  assert.doesNotMatch(home, /inventory_number|查看詳情/);
});

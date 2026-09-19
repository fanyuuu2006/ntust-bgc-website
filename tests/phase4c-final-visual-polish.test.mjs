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

test("discovery cards give each metadata field an independent overflow boundary", async () => {
  const card = await source("src/components/(public)/board-games/BoardGameCard.tsx");

  assert.doesNotMatch(card, /metadata\.join/);
  assert.match(card, /flex min-h-5 min-w-0 items-center/);
  assert.equal((card.match(/min-w-0 flex-1 truncate/g) ?? []).length, 2);
  assert.match(card, /title=\{boardGame\.category\.name\}/);
  assert.match(card, /title=\{boardGame\.location\.name\}/);
  assert.match(card, /shrink-0 whitespace-nowrap[^>]*>[\s\S]*#\{boardGame\.inventory_number\}/);
  assert.match(card, /className="mt-2 min-h-5 min-w-0"[\s\S]*<BoardGameRatingMetadata/);
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

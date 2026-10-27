import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("register-key generation and cross-page navigation remain directly visible", async () => {
  const page = await source("src/app/(admin)/admin/memberships/register-keys/page.tsx");
  const form = await source("src/components/(admin)/admin/memberships/RegisterKeyGenerateForm.tsx");
  assert.match(page, /<RegisterKeyGenerateForm/);
  assert.match(page, /actions=\{[\s\S]*?<ButtonLink[\s\S]*?返回社員資格管理/);
  assert.match(form, /已產生 \$\{generatedKeys\.length\} 組社員註冊序號/);
  assert.match(form, /aria-live="polite"/);
});
test("discovery cards keep metadata independently constrained", async () => {
  const card = await source("src/components/(public)/board-games/BoardGameCard.tsx");
  assert.doesNotMatch(card, /metadata\.join/);
  assert.match(card, /min-w-0 flex-1 truncate/);
  assert.match(card, /BoardGameRatingMetadata/);
});
test("homepage preview reuses canonical card with action suppressed", async () => {
  const home = await source("src/components/(public)/home/PopularBoardGamesSection.tsx");
  assert.match(home, /<BoardGameCard[\s\S]*showAction=\{false\}/);
  assert.doesNotMatch(home, /HomeBoardGamePreview/);
});

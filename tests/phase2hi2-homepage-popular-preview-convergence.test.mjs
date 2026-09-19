import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage popular grid keeps mobile density while bounding wide desktop cards", async () => {
  const section = await readSource(
    "src/components/(public)/home/PopularBoardGamesSection.tsx",
  );

  assert.match(section, /grid-cols-2/);
  assert.match(section, /sm:grid-cols-3/);
  assert.match(section, /lg:grid-cols-4/);
  assert.match(section, /xl:grid-cols-6/);
  assert.match(section, /items-stretch/);
  assert.doesNotMatch(
    section,
    /grid[^"\n]*items-start|items-start[^"\n]*grid-cols|max-w-5xl/,
  );
});

test("homepage preview reuses the canonical equal-height card", async () => {
  const preview = await readSource(
    "src/components/(public)/board-games/BoardGameCard.tsx",
  );

  assert.match(preview, /className="group flex h-full min-w-0 flex-col/);
  assert.match(preview, /aspect-square/);
  assert.match(preview, /line-clamp-2 min-h-10/);
  assert.match(preview, /flex-1|mt-auto/);
});

test("homepage composition suppresses the CTA without duplicating card presentation", async () => {
  const [section, preview] = await Promise.all([
    readSource("src/components/(public)/home/PopularBoardGamesSection.tsx"),
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
  ]);

  assert.equal((preview.match(/<Link\b/g) ?? []).length, 1);
  assert.match(section, /showAction=\{false\}/);
  assert.doesNotMatch(preview, /<button\b|description/);
  assert.match(preview, /inventory_number|查看詳情/);
  assert.doesNotMatch(preview, /BoardGamePopularity|completedBorrowCount/);
  assert.match(preview, /BoardGameRatingMetadata/);
});

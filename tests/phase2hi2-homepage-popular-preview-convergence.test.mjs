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

test("homepage preview uses a complete equal-height chain without artificial body spacers", async () => {
  const preview = await readSource(
    "src/components/(public)/home/HomeBoardGamePreview.tsx",
  );

  assert.match(preview, /className="group flex h-full min-w-0 flex-col/);
  assert.match(preview, /aspect-3\/2/);
  assert.doesNotMatch(preview, /aspect-4\/3/);
  assert.match(preview, /line-clamp-2 min-h-10/);
  assert.doesNotMatch(preview, /flex-1|mt-auto/);
});

test("homepage preview remains a single-link discovery summary without ranking statistics", async () => {
  const preview = await readSource(
    "src/components/(public)/home/HomeBoardGamePreview.tsx",
  );

  assert.equal((preview.match(/<Link\b/g) ?? []).length, 1);
  assert.doesNotMatch(preview, /<button\b|inventory_number|description|查看詳情/);
  assert.doesNotMatch(preview, /BoardGamePopularity|completedBorrowCount/);
});

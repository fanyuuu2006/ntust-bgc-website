import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage popular cards use compact natural-height bodies inside the equal-height grid", async () => {
  const [section, preview] = await Promise.all([
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
    readSource("src/components/(public)/home/HomeBoardGamePreview.tsx"),
  ]);

  assert.match(
    section,
    /grid-cols-2 items-stretch gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4/,
  );
  assert.match(preview, /className="group flex h-full min-w-0 flex-col/);
  assert.match(preview, /<div className="min-w-0 p-3">/);
  assert.doesNotMatch(preview, /<div className="[^"]*(?:h-full|flex-1|mt-auto)[^"]*p-3/);
  assert.doesNotMatch(preview, /sm:p-4/);
});

test("homepage popular card keeps one title anchor and compactly groups popularity with metadata", async () => {
  const [preview, popularity] = await Promise.all([
    readSource("src/components/(public)/home/HomeBoardGamePreview.tsx"),
    readSource(
      "src/components/(public)/board-games/BoardGamePopularity.tsx",
    ),
  ]);

  assert.match(preview, /line-clamp-2 min-h-10/);
  assert.match(preview, /sm:min-h-11/);
  assert.match(preview, /className="mt-2 break-words/);
  assert.match(preview, /BoardGamePopularity[^>]*className="mt-1\.5"/);
  assert.doesNotMatch(preview, /BoardGamePopularity[^>]*className="mt-3"/);
  assert.doesNotMatch(preview, /inventory_number|description|查看詳情/);
  assert.match(popularity, /completedBorrowCount <= 0/);
});

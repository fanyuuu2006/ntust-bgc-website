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
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
  ]);

  assert.match(
    section,
    /grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6/,
  );
  assert.match(preview, /className="group flex h-full min-w-0 flex-col/);
  assert.match(preview, /<div className="flex min-w-0 flex-1 flex-col p-3">/);
  assert.match(section, /showAction=\{false\}/);
  assert.doesNotMatch(preview, /sm:p-4/);
});

test("homepage popular card keeps one title anchor and compact metadata", async () => {
  const preview = await readSource(
    "src/components/(public)/board-games/BoardGameCard.tsx",
  );

  assert.match(preview, /line-clamp-2 min-h-10/);
  assert.match(preview, /sm:min-h-11/);
  assert.match(preview, /min-w-0 flex-1 truncate/);
  assert.doesNotMatch(
    preview,
    /BoardGamePopularity|completedBorrowCount|description/,
  );
  assert.match(preview, /inventory_number|查看詳情/);
  assert.match(preview, /BoardGameRatingMetadata/);
});

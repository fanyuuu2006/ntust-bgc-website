import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
test("contributor ranking separates search empty state from an empty leaderboard", async () => {
  const source = await readFile(new URL("src/components/(public)/rankings/ReviewContributorRankingList.tsx", root), "utf8");
  assert.match(source, /hasSearch/);
  assert.match(source, /emptyTitle=\{hasSearch \?/);
  assert.match(source, /emptyDescription=\{hasSearch \?/);
  assert.match(source, /emptyWithinContainer/);
});

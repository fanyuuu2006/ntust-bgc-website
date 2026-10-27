import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public event range query is paginated with stable ordering and a page cap", async () => {
  const source = await readFile(new URL("../src/repositories/events.repository.ts", import.meta.url), "utf8");
  assert.match(source, /PUBLIC_EVENTS_PAGE_SIZE\s*=\s*500/);
  assert.match(source, /PUBLIC_EVENTS_MAX_PAGES\s*=\s*20/);
  assert.match(source, /\.range\(fromRow, toRow\)/);
  assert.match(source, /\.order\("start_time", \{ ascending: true \}\)[\s\S]*\.order\("id", \{ ascending: true \}\)/);
  assert.match(source, /seenIds/);
});

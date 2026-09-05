import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("public Announcements uses the compact canonical search-only toolbar without a content Card", async () => {
  const source = await readSource("src/app/(public)/announcements/page.tsx");

  assert.match(
    source,
    /<form\s+method="GET"\s+action="\/announcements"/,
  );
  assert.match(source, /grid min-w-0 gap-2/);
  assert.match(source, /sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(source, /ClearableSearchInput/);
  assert.match(
    source,
    /<Button[^>]*type="submit"[^>]*variant="primary"[^>]*className="w-full sm:w-auto"[^>]*>\s*搜尋\s*<\/Button>/,
  );
  assert.match(source, /name="page" value="1"/);
  assert.match(source, /name="pageSize" value=\{pageSize\}/);

  assert.doesNotMatch(source, /import \{ Card \}/);
  assert.doesNotMatch(source, /<Card[\s\S]*?<form/);
  assert.doesNotMatch(source, /inputClassName=/);
  assert.doesNotMatch(source, /"use client"|useEffect|fetch\(/);
});

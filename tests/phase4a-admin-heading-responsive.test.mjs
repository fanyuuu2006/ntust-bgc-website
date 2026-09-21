import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("Admin HeadingSection owns compact mobile typography and preserves desktop scale", async () => {
  const source = await readSource("src/components/(admin)/admin/HeadingSection.tsx");
  assert.match(source, /text-lg font-semibold[^\n]+sm:text-2xl/);
  assert.match(source, /text-xs text-\(--text-muted\) sm:text-sm/);
  assert.match(source, /flex flex-col[^\n]+sm:flex-row/);
  assert.doesNotMatch(source, /md:text|lg:text/);
});

test("the shared heading remains Admin-scoped and covers representative export pages", async () => {
  const pages = [
    "src/app/(admin)/admin/users/page.tsx",
    "src/app/(admin)/admin/memberships/page.tsx",
    "src/app/(admin)/admin/board-games/page.tsx",
    "src/app/(admin)/admin/events/[id]/page.tsx",
  ];
  for (const path of pages) {
    const source = await readSource(path);
    assert.match(source, /components\/\(admin\)\/admin\/HeadingSection/);
    assert.match(source, /<HeadingSection/);
  }
});

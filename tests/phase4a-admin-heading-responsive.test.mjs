import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("Admin HeadingSection keeps semantic collection headings without duplicating visible chrome", async () => {
  const source = await readSource("src/components/(admin)/admin/HeadingSection.tsx");
  assert.match(source, /text-lg font-semibold[^\n]+sm:text-2xl/);
  assert.match(source, /text-xs text-\(--text-muted\) sm:text-sm/);
  assert.match(source, /flex flex-col[^\n]+sm:flex-row/);
  assert.match(source, /collection && "sr-only"/);
  assert.match(source, /collection && \(actions \? "gap-0 py-2" : "p-0"\)/);
  assert.match(source, /flex w-full shrink-0 flex-wrap/);
  assert.doesNotMatch(source, /secondaryActions|更多頁面操作|MoreHorizontal/);
  assert.doesNotMatch(source, /md:text|lg:text/);
});

test("Admin header labels the mobile location without competing with the page h1", async () => {
  const source = await readSource("src/components/(admin)/AdminHeader.tsx");

  assert.match(source, /<p[\s\S]*?aria-current="page"/);
  assert.doesNotMatch(source, /text-\(--text-primary\) lg:hidden/);
  assert.doesNotMatch(source, /<h1/);
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

test("collection pages opt into mobile heading compaction without changing detail headings", async () => {
  const [memberships, boardGames, events, eventDetail] = await Promise.all([
    readSource("src/app/(admin)/admin/memberships/page.tsx"),
    readSource("src/app/(admin)/admin/board-games/page.tsx"),
    readSource("src/app/(admin)/admin/events/page.tsx"),
    readSource("src/app/(admin)/admin/events/[id]/page.tsx"),
  ]);

  for (const source of [memberships, boardGames, events]) {
    assert.match(source, /<HeadingSection[\s\S]*?collection/);
  }
  assert.doesNotMatch(eventDetail, /<HeadingSection[\s\S]*?collection/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public list routes use the shared PageHeader directly on the page canvas", async () => {
  const [announcementsPage, boardGamesPage] = await Promise.all([
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(public)/board-games/page.tsx"),
  ]);

  for (const source of [announcementsPage, boardGamesPage]) {
    assert.match(source, /<PageHeader/);
    assert.match(source, /className="container[^\"]*py-8/);
    assert.doesNotMatch(
      source,
      /border-b border-\(--border-muted\) bg-\(--surface-(?:default|subtle)\)/,
    );
  }

  assert.doesNotMatch(
    announcementsPage,
    /aria-hidden="true"[^>]*bg-\(--interactive-primary\)/,
  );
});

test("announcement search remains native GET controls without an outer surface", async () => {
  const page = await readSource("src/app/(public)/announcements/page.tsx");
  const form = page.match(/<form[\s\S]*?<\/form>/)?.[0] ?? "";

  assert.match(form, /method="GET"/);
  assert.match(form, /action="\/announcements"/);
  assert.match(form, /<ClearableSearchInput/);
  assert.match(form, /max-w-3xl/);
  assert.doesNotMatch(
    form,
    /rounded-xl|shadow-|bg-\(--surface-(?:default|subtle)\)|border border-/,
  );
});

test("board-game controls remain one flat URL-authoritative utility group", async () => {
  const formSource = await readSource(
    "src/components/(public)/board-games/BoardGameSearchForm.tsx",
  );
  const form = formSource.match(/<form[\s\S]*?<\/form>/)?.[0] ?? "";
  const formOpeningTag = form.match(/<form[^>]*>/)?.[0] ?? "";

  assert.match(form, /method="GET"/);
  assert.match(form, /action=\{BASE_PATH\}/);
  assert.match(form, /PreservedQueryFields/);
  assert.match(formSource, /aria-live="polite"/);
  assert.doesNotMatch(
    formOpeningTag,
    /rounded-xl|shadow-|bg-\(--surface-default\)|border border-\(--border-default\)/,
  );
});

test("editorial rows and the accepted catalog grid survive the visual reset", async () => {
  const [row, list, boardGamesPage, grid] = await Promise.all([
    readSource("src/components/(public)/announcements/AnnouncementRow.tsx"),
    readSource("src/components/(public)/announcements/AnnouncementList.tsx"),
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/components/(public)/board-games/BoardGameGrid.tsx"),
  ]);

  assert.match(list, /<AnnouncementRow/);
  assert.equal((row.match(/<Link\b/g) ?? []).length, 1);
  assert.doesNotMatch(row, /rounded-lg|shadow-|translate-y|<button\b/);

  assert.doesNotMatch(boardGamesPage, /["']use client["']|useEffect|fetch\(/);
  assert.match(boardGamesPage, /boardGamesService\.listBoardGameDiscovery/);
  assert.match(grid, /grid-cols-2/);
  assert.match(grid, /sm:grid-cols-3/);
  assert.match(grid, /md:grid-cols-4/);
  assert.match(grid, /xl:grid-cols-6/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public index routes share PageHeader while keeping contextual route identity", async () => {
  const [announcementsPage, boardGamesPage] = await Promise.all([
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(public)/board-games/page.tsx"),
  ]);

  assert.match(announcementsPage, /<PageHeader/);
  assert.match(announcementsPage, /eyebrow="最新消息"/);
  assert.match(boardGamesPage, /import \{ PageHeader \}/);
  assert.match(boardGamesPage, /<PageHeader/);
  assert.match(boardGamesPage, /eyebrow="桌遊探索"/);
  assert.doesNotMatch(boardGamesPage, /<header\b|<h1\b/);

  for (const source of [announcementsPage, boardGamesPage]) {
    assert.doesNotMatch(
      source,
      /PublicPageLayout|PublicSection|PublicDiscoveryShell|PublicToolbarManager|PublicVisualCard/,
    );
  }
});

test("announcements group a bounded native search utility ahead of editorial results", async () => {
  const page = await readSource("src/app/(public)/announcements/page.tsx");

  assert.match(page, /<form\s+[\s\S]*?method="GET"[\s\S]*?action="\/announcements"/);
  assert.match(page, /<ClearableSearchInput/);
  assert.match(page, /<Pagination/);
  assert.match(page, /max-w-3xl/);
  assert.doesNotMatch(page, /<section className="py-8">/);
  assert.doesNotMatch(page, /max-w-5xl space-y-6/);
});

test("board-game controls and result utility form one flat region", async () => {
  const form = await readSource(
    "src/components/(public)/board-games/BoardGameSearchForm.tsx",
  );

  assert.match(form, /<form[\s\S]*?method="GET"[\s\S]*?action=\{BASE_PATH\}/);
  assert.match(form, /PreservedQueryFields/);
  assert.match(form, /pageSize/);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /<div className="space-y-2"/);
  assert.doesNotMatch(
    form,
    /<form[^>]*className="[^"]*(?:rounded-xl|shadow-|bg-\(--surface-default\)|border border-)/,
  );
  assert.doesNotMatch(form, /aria-hidden="true"[^>]*border-b/);
});

test("board-game results remain SSR and preserve the accepted catalog grid", async () => {
  const [page, grid] = await Promise.all([
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/components/(public)/board-games/BoardGameGrid.tsx"),
  ]);

  assert.doesNotMatch(page, /["']use client["']|useEffect|fetch\(/);
  assert.match(page, /boardGamesService\.listBoardGameDiscovery/);
  assert.match(page, /<BoardGameSearchForm/);
  assert.match(page, /<BoardGameGrid/);
  assert.match(page, /<Pagination/);
  assert.match(grid, /grid-cols-2/);
  assert.match(grid, /sm:grid-cols-3/);
  assert.match(grid, /md:grid-cols-4/);
  assert.match(grid, /xl:grid-cols-6/);
});

test("shared announcement rows keep homepage compact and canonical default densities", async () => {
  const [homepage, list] = await Promise.all([
    readSource("src/components/(public)/home/LatestAnnouncementsSection.tsx"),
    readSource("src/components/(public)/announcements/AnnouncementList.tsx"),
  ]);

  assert.match(homepage, /<AnnouncementRow/);
  assert.match(homepage, /density="compact"/);
  assert.match(list, /<AnnouncementRow/);
  assert.match(list, /density="default"/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("announcements use shared page flow, flat controls, and an editorial results entrance", async () => {
  const page = await readSource("src/app/(public)/announcements/page.tsx");

  assert.match(page, /className="container[^\"]*py-8/);
  assert.doesNotMatch(page, /border-b border-\(--border-muted\) bg-\(--surface-default\)/);
  assert.doesNotMatch(page, /aria-hidden="true"[^>]*bg-\(--interactive-primary\)/);
  assert.match(
    page,
    /<form[\s\S]*?method="GET"[\s\S]*?action="\/announcements"[\s\S]*?max-w-3xl/,
  );
  assert.doesNotMatch(
    page,
    /<form[\s\S]*?className="[^"]*(?:rounded-xl|bg-\(--surface-subtle\)|border border-)/,
  );
  assert.match(page, /全部公告/);
  assert.match(page, /共 \{announcements\.total\} 筆/);
  assert.match(page, /<AnnouncementList/);
  assert.doesNotMatch(page, /<Card|shadow-|translate-y/);
});

test("canonical announcement rows retain restrained editorial links without per-row card shape", async () => {
  const [row, list] = await Promise.all([
    readSource("src/components/(public)/announcements/AnnouncementRow.tsx"),
    readSource("src/components/(public)/announcements/AnnouncementList.tsx"),
  ]);

  assert.match(list, /density="default"/);
  assert.match(row, /density === "compact"/);
  assert.doesNotMatch(row, /rounded-lg/);
  assert.equal((row.match(/<Link\b/g) ?? []).length, 1);
  assert.doesNotMatch(row, /shadow-|translate-y|<button\b/);
});

test("board games use shared page flow and flat discovery controls", async () => {
  const [page, form] = await Promise.all([
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
  ]);

  assert.match(page, /className="container[^\"]*py-8/);
  assert.doesNotMatch(page, /border-b border-\(--border-muted\) bg-\(--surface-subtle\)/);
  assert.match(page, /<PageHeader[\s\S]*?eyebrow="桌遊探索"/);
  assert.match(form, /<div className="space-y-2"/);
  assert.doesNotMatch(
    form,
    /<form[^>]*className="[^"]*(?:rounded-xl|shadow-|bg-\(--surface-default\)|border border-)/,
  );
  assert.match(form, /aria-live="polite"/);
  assert.doesNotMatch(form, /aria-hidden="true"[^>]*border-b/);
  assert.doesNotMatch(page, /["']use client["']|useEffect|fetch\(/);
});

test("catalog data scope and responsive grid remain unchanged", async () => {
  const [card, grid] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
    readSource("src/components/(public)/board-games/BoardGameGrid.tsx"),
  ]);

  assert.match(grid, /grid-cols-2/);
  assert.match(grid, /sm:grid-cols-3/);
  assert.match(grid, /md:grid-cols-4/);
  assert.match(grid, /xl:grid-cols-6/);
  assert.match(card, /BoardGameImage/);
  assert.match(card, /BoardGameStatusBadge/);
  assert.match(card, /BoardGamePopularity/);
  assert.match(card, /inventory_number/);
  assert.doesNotMatch(card, /rating|ranking|viewCount/);
});

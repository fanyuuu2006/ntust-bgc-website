import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage hero uses native section anchors with stable sticky-header targets", async () => {
  const [page, hero, announcements, popular] = await Promise.all([
    readSource("src/app/(public)/page.tsx"),
    readSource("src/components/(public)/home/HomeHero.tsx"),
    readSource(
      "src/components/(public)/home/LatestAnnouncementsSection.tsx",
    ),
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
  ]);

  assert.match(hero, /href="#popular-board-games"/);
  assert.match(hero, /href="#latest-announcements"/);
  assert.doesNotMatch(hero, /href="\/board-games"[^>]*>\s*找桌遊/);
  assert.doesNotMatch(hero, /href="\/announcements"[^>]*>\s*最新公告/);
  assert.match(announcements, /id="latest-announcements"/);
  assert.match(popular, /id="popular-board-games"/);
  assert.match(announcements, /scroll-mt-/);
  assert.match(popular, /scroll-mt-/);
  assert.match(page, /<HomeHero\s*\/>/);
});

test("latest announcements preview is a published-only top-three semantic list", async () => {
  const [section, row] = await Promise.all([
    readSource("src/components/(public)/home/LatestAnnouncementsSection.tsx"),
    readSource("src/components/(public)/announcements/AnnouncementRow.tsx"),
  ]);

  assert.match(
    section,
    /announcementsService\.listPublished\(\{[\s\S]*?page:\s*1,[\s\S]*?pageSize:\s*3,[\s\S]*?\}\)/,
  );
  assert.match(section, /<ul/);
  assert.match(section, /<AnnouncementRow/);
  assert.match(row, /<article/);
  assert.match(row, /<time/);
  assert.match(section, /href="\/announcements"/);
  assert.match(section, /目前沒有最新公告/);
  assert.doesNotMatch(section, /ClearableSearchInput|BoardGameSearchForm|Pagination/);
});

test("popular games preview consumes the reusable top-six service contract", async () => {
  const [section, preview, popularity] = await Promise.all([
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
    readSource("src/components/(public)/home/HomeBoardGamePreview.tsx"),
    readSource(
      "src/components/(public)/board-games/BoardGamePopularity.tsx",
    ),
  ]);

  assert.match(
    section,
    /boardGamesService\.listPopularBoardGames\(\{[\s\S]*?limit:\s*6,[\s\S]*?\}\)/,
  );
  assert.match(section, /grid-cols-2/);
  assert.match(section, /md:grid-cols-3/);
  assert.match(section, /href="\/board-games"/);
  assert.match(section, /目前尚無桌遊資料/);
  assert.match(preview, /BoardGameImage/);
  assert.match(preview, /BoardGameStatusBadge/);
  assert.match(preview, /BoardGamePopularity/);
  assert.match(popularity, /completedBorrowCount <= 0/);
  assert.match(popularity, /熱門度/);
  assert.match(popularity, /\{completedBorrowCount\} 次借用/);
  assert.doesNotMatch(preview, /inventory_number|description|fetch\(/);
});

test("homepage keeps hero immediate and streams isolated server sections", async () => {
  const [page, announcements, popular] = await Promise.all([
    readSource("src/app/(public)/page.tsx"),
    readSource(
      "src/components/(public)/home/LatestAnnouncementsSection.tsx",
    ),
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
  ]);

  assert.equal(((announcements + popular).match(/<Suspense\b/g) ?? []).length, 2);
  assert.match(page, /<LatestAnnouncementsSection\s*\/>/);
  assert.match(page, /<PopularBoardGamesSection\s*\/>/);
  assert.doesNotMatch(
    page + announcements + popular,
    /"use client"|useEffect|fetch\(/,
  );
});

test("homepage section headers stack their full-route links on narrow screens", async () => {
  const [announcements, popular] = await Promise.all([
    readSource(
      "src/components/(public)/home/LatestAnnouncementsSection.tsx",
    ),
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
  ]);

  for (const section of [announcements, popular]) {
    assert.match(section, /flex flex-col items-start/);
    assert.match(section, /sm:flex-row/);
  }
});

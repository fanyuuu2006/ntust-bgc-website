import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage hero supports a local activity photo with a neutral missing-asset fallback", async () => {
  const hero = await readSource(
    "src/components/(public)/home/HomeHero.tsx",
  );

  assert.match(hero, /from "next\/image"/);
  assert.match(hero, /\/images\/home\/hero\.jpg/);
  assert.match(hero, /existsSync/);
  assert.match(hero, /fill/);
  assert.match(hero, /priority/);
  assert.match(hero, /sizes="100vw"/);
  assert.match(hero, /object-cover/);
  assert.doesNotMatch(hero, /w-2\/5|bg-white\/5/);
});

test("homepage refinement keeps anchors while using the approved brand copy", async () => {
  const [hero, announcements, popular, announcementsPage] = await Promise.all([
    readSource("src/components/(public)/home/HomeHero.tsx"),
    readSource(
      "src/components/(public)/home/LatestAnnouncementsSection.tsx",
    ),
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
    readSource("src/app/(public)/announcements/page.tsx"),
  ]);

  assert.match(hero, /一起玩桌遊，也一起玩出更多可能。/);
  assert.match(hero, /href="#popular-board-games"/);
  assert.match(hero, /href="#latest-announcements"/);
  assert.match(announcements, /看看社團最近有哪些消息。/);
  assert.match(announcementsPage, /社團最新消息與活動公告。/);
  assert.match(popular, /看看社團裡受歡迎的桌遊。/);
  assert.doesNotMatch(popular, /最近最受歡迎|最近最受社友喜愛/);
});

test("popular preview stays two-column on mobile and uses the container for its compact desktop grid", async () => {
  const [section, preview] = await Promise.all([
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
    readSource("src/components/(public)/home/HomeBoardGamePreview.tsx"),
  ]);

  assert.match(section, /grid-cols-2/);
  assert.match(section, /sm:grid-cols-3/);
  assert.match(section, /lg:grid-cols-4/);
  assert.match(section, /xl:grid-cols-6/);
  assert.match(section, /items-stretch/);
  assert.doesNotMatch(section, /max-w-5xl/);
  assert.match(preview, /className="group flex h-full/);
  assert.doesNotMatch(preview, /className="flex min-w-0 flex-1/);
  assert.match(preview, /line-clamp-2 min-h-10/);
  assert.doesNotMatch(preview, /inventory_number|description|查看詳情/);
});

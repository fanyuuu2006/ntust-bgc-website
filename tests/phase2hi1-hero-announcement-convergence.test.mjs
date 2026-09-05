import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("homepage hero uses a lighter responsive overlay and taller bounded mobile stage", async () => {
  const hero = await readSource(
    "src/components/(public)/home/HomeHero.tsx",
  );

  assert.match(hero, /min-h-104/);
  assert.match(hero, /sm:min-h-110/);
  assert.match(hero, /lg:min-h-124/);
  assert.match(hero, /bg-black\/40/);
  assert.match(hero, /lg:from-black\/60/);
  assert.match(hero, /lg:via-black\/30/);
  assert.match(hero, /lg:to-black\/10/);
  assert.doesNotMatch(hero, /from-black\/75|via-black\/55|100vh|min-h-screen/);
  assert.match(hero, /href="#popular-board-games"/);
  assert.match(hero, /href="#latest-announcements"/);
});

test("homepage and canonical announcements reuse one feature-owned row grammar", async () => {
  const rowPath =
    "src/components/(public)/announcements/AnnouncementRow.tsx";
  await access(new URL(rowPath, root));

  const [row, homepage, list] = await Promise.all([
    readSource(rowPath),
    readSource(
      "src/components/(public)/home/LatestAnnouncementsSection.tsx",
    ),
    readSource(
      "src/components/(public)/announcements/AnnouncementList.tsx",
    ),
  ]);

  assert.match(homepage, /<AnnouncementRow/);
  assert.match(homepage, /density="compact"/);
  assert.match(homepage, /headingLevel=\{3\}/);
  assert.match(list, /<AnnouncementRow/);
  assert.match(list, /density="default"/);
  assert.match(list, /headingLevel=\{2\}/);

  assert.match(row, /<article/);
  assert.match(row, /<Link/);
  assert.match(row, /<time/);
  assert.match(row, /px-2/);
  assert.match(row, /hover:bg-\(--surface-subtle\)/);
  assert.match(row, /group-hover:text-\(--interactive-primary\)/);
  assert.match(row, /focus-visible:outline-2/);
  assert.match(row, /line-clamp-2/);
  assert.doesNotMatch(row, /Card|查看公告|ArrowRight|shadow-|translate-y/);
});

test("homepage section header does not add a competing divider above announcement rows", async () => {
  const homepage = await readSource(
    "src/components/(public)/home/LatestAnnouncementsSection.tsx",
  );

  assert.doesNotMatch(
    homepage,
    /items-start[^"\n]*border-b[^"\n]*pb-4/,
  );
});

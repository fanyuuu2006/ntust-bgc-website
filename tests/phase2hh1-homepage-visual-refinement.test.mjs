import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage hero supports a local activity photo with a neutral missing-asset fallback", async () => {
  const hero = await readSource(
    "src/components/(public)/home/HomeHeroPresentation.tsx",
  );

  assert.match(hero, /from "next\/image"/);
  assert.match(hero, /heroImageUrl/);
  assert.match(hero, /object-cover/);
  assert.match(hero, /HomeHeroPresentation/);
  assert.match(hero, /object-cover/);
  assert.doesNotMatch(hero, /w-2\/5|bg-white\/5/);
});

test("homepage refinement keeps anchors while using the approved brand copy", async () => {
  const hero = await readSource(
    "src/components/(public)/home/HomeHeroPresentation.tsx",
  );

  assert.match(hero, /heroTitle/);
  assert.match(hero, /href="#popular-board-games"/);
  assert.match(hero, /href="#latest-announcements"/);
});

test("popular preview stays two-column on mobile and uses the container for its compact desktop grid", async () => {
  const [section, preview] = await Promise.all([
    readSource(
      "src/components/(public)/home/PopularBoardGamesSection.tsx",
    ),
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
  ]);

  assert.match(section, /grid-cols-2/);
  assert.match(section, /sm:grid-cols-3/);
  assert.match(section, /lg:grid-cols-4/);
  assert.match(section, /xl:grid-cols-6/);
  assert.match(section, /items-stretch/);
  assert.doesNotMatch(section, /max-w-5xl/);
  assert.match(preview, /className="group flex h-full/);
  assert.match(section, /<BoardGameCard[\s\S]*showAction=\{false\}/);
  assert.match(preview, /line-clamp-2 min-h-10/);
  assert.match(preview, /inventory_number/);
  assert.doesNotMatch(preview, /description/);
});

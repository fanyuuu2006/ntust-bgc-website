import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

function gridClassNames(source) {
  return [...source.matchAll(/className="([^"]*\bgrid\b[^"]*)"/g)].map(
    (match) => match[1],
  );
}

test("homepage popular preview stays bounded from mobile through wide desktop", async () => {
  const section = await readSource(
    "src/components/(public)/home/PopularBoardGamesSection.tsx",
  );
  const grids = gridClassNames(section);

  assert.equal(grids.length, 2, "final and loading grids should share one layout contract");
  for (const classes of grids) {
    assert.match(classes, /\bgrid-cols-2\b/);
    assert.match(classes, /\bsm:grid-cols-3\b/);
    assert.match(classes, /\blg:grid-cols-4\b/);
    assert.match(classes, /\bxl:grid-cols-6\b/);
    assert.match(classes, /\bitems-stretch\b/);
  }
  assert.equal(grids[0], grids[1], "loading and resolved grids must use identical classes");
  assert.doesNotMatch(section, /max-w-(?:3xl|4xl|5xl|6xl|7xl)/);
});

test("homepage popular cards remain compact visual teasers without ranking statistics", async () => {
  const [section, preview] = await Promise.all([
    readSource("src/components/(public)/home/PopularBoardGamesSection.tsx"),
    readSource("src/components/(public)/home/HomeBoardGamePreview.tsx"),
  ]);

  assert.match(section, /listPopularBoardGames\(\{\s*limit:\s*6/);
  assert.match(section, /href="\/board-games"/);
  assert.equal((preview.match(/<Link\b/g) ?? []).length, 1);
  assert.match(preview, /BoardGameImage/);
  assert.match(preview, /BoardGameStatusBadge/);
  assert.match(preview, /aspect-3\/2/);
  assert.match(preview, /boardGame\.name/);
  assert.match(preview, /boardGame\.category|metadata/);
  assert.match(preview, /boardGame\.location|metadata/);
  assert.doesNotMatch(
    preview,
    /BoardGamePopularity|completedBorrowCount|inventory_number|description/,
  );
});

test("popular section and footer use distinct responsibility-owned surfaces", async () => {
  const [section, footer] = await Promise.all([
    readSource("src/components/(public)/home/PopularBoardGamesSection.tsx"),
    readSource("src/components/Footer/Footer.tsx"),
  ]);

  assert.match(section, /bg-\(--surface-page\)/);
  assert.doesNotMatch(section, /bg-\(--surface-subtle\)/);
  assert.match(footer, /border-t[^"\n]*bg-\(--surface-subtle\)/);
});

test("canonical board-game discovery keeps its richer card and catalog grid", async () => {
  const [grid, card] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameGrid.tsx"),
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
  ]);

  assert.match(
    grid,
    /grid-cols-2[^"\n]*sm:grid-cols-3[^"\n]*md:grid-cols-4[^"\n]*xl:grid-cols-6/,
  );
  assert.match(card, /inventory_number/);
  assert.match(card, /BoardGamePopularity/);
  assert.match(card, /aspect-square/);
});


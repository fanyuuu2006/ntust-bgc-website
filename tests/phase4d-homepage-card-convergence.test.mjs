import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("homepage popular games reuse the canonical BoardGameCard presentation", async () => {
  const [section, card, types, repository] = await Promise.all([
    source("src/components/(public)/home/PopularBoardGamesSection.tsx"),
    source("src/components/(public)/board-games/BoardGameCard.tsx"),
    source("src/services/board-games/board-games.types.ts"),
    source("src/repositories/board-game-statistics.repository.ts"),
  ]);

  assert.match(section, /import \{ BoardGameCard \}/);
  assert.match(section, /<BoardGameCard[^>]*boardGame=\{boardGame\}[^>]*returnTo="\/"[^>]*showAction=\{false\}/);
  assert.doesNotMatch(section, /HomeBoardGamePreview/);
  assert.match(card, /showAction\?: boolean/);
  assert.match(card, /showAction = true/);
  assert.match(card, /\{showAction \? \([\s\S]*查看詳情[\s\S]*\) : null\}/);
  assert.match(types, /export type HomeBoardGameItem = BoardGameDiscoveryItem/);
  assert.match(repository, /findPopular[\s\S]*inventory_number/);
});

test("canonical card retains independent metadata cells and deterministic return links", async () => {
  const card = await source("src/components/(public)/board-games/BoardGameCard.tsx");

  assert.equal((card.match(/min-w-0 flex-1 truncate/g) ?? []).length, 2);
  assert.match(card, /title=\{boardGame\.category\.name\}/);
  assert.match(card, /title=\{boardGame\.location\.name\}/);
  assert.match(card, /shrink-0 whitespace-nowrap[\s\S]*#\{boardGame\.inventory_number\}/);
  assert.match(card, /buildBoardGameDetailHref\(boardGame\.id, returnTo\)/);
  assert.doesNotMatch(card, /router\.back|history\.back/);
});

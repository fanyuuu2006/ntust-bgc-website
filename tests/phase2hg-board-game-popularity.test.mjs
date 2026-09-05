import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("derived board-game statistics count only completed borrowing states", async () => {
  const [migration, schema] = await Promise.all([
    readSource("supabase/migrations/202609060001_add_board_game_statistics.sql"),
    readSource("supabase/schema/canonical-public-schema.sql"),
  ]);

  for (const source of [migration, schema]) {
    assert.match(source, /board_games_with_statistics/);
    assert.match(source, /count\(\*\)::bigint as completed_borrow_count/i);
    assert.match(
      source,
      /where borrowing\.status\s+in\s*\(\s*'borrowed'\s*,\s*'returned'\s*\)/i,
    );
    assert.match(source, /coalesce\(statistics\.completed_borrow_count, 0\)/i);
    assert.doesNotMatch(
      source.match(/count\(\*\)[^;]+statistics\.board_game_id/is)?.[0] ?? "",
      /'pending'|'approved'|'rejected'|'cancelled'/,
    );
    assert.match(source, /security_invoker\s*=\s*true/i);
    assert.match(source, /grant select[\s\S]*service_role/i);
  }

  assert.match(
    migration,
    /create index if not exists board_game_borrowings_completed_board_game_idx[\s\S]*where status in \('borrowed', 'returned'\)/i,
  );
});

test("popular ordering is database-owned, deterministic, and precedes pagination", async () => {
  const repository = await readSource(
    "src/repositories/board-game-statistics.repository.ts",
  );

  const popularityOrder = repository.indexOf('.order("completed_borrow_count"');
  const tieOrder = repository.indexOf('.order("inventory_number"');
  const pagination = repository.indexOf(".range(from, to)");

  assert.ok(popularityOrder >= 0);
  assert.ok(tieOrder > popularityOrder);
  assert.ok(pagination > tieOrder);
  assert.match(repository, /ascending: false/);
  assert.match(repository, /findPopular/);
  assert.doesNotMatch(repository, /\.sort\(/);
});

test("public discovery defaults to popular while retaining every established sort", async () => {
  const [constants, page, types] = await Promise.all([
    readSource("src/app/(public)/board-games/constants.ts"),
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/services/board-games/board-games.types.ts"),
  ]);

  assert.match(constants, /key: "popular"[\s\S]*label: "熱門程度"/);
  assert.ok(constants.indexOf('key: "popular"') < constants.indexOf('key: "created_at:desc"'));
  for (const key of [
    "created_at:desc",
    "created_at:asc",
    "name:asc",
    "name:desc",
    "inventory_number:asc",
    "inventory_number:desc",
    "updated_at:desc",
  ]) {
    assert.match(constants, new RegExp(`key: "${key}"`));
  }
  assert.match(page, /listBoardGameDiscovery/);
  assert.match(types, /export type BoardGameStats/);
  assert.match(types, /completedBorrowCount: number/);
  assert.match(types, /export type BoardGameDiscoveryItem/);
  assert.match(types, /stats: BoardGameStats/);
});

test("cards consume the statistics read model without querying borrowings", async () => {
  const [card, grid] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
    readSource("src/components/(public)/board-games/BoardGameGrid.tsx"),
  ]);

  assert.match(card, /boardGame\.stats\.completedBorrowCount/);
  assert.match(card, /熱門度/);
  assert.match(card, /\{completedBorrowCount\} 次借用/);
  assert.doesNotMatch(
    card + grid,
    /apiClient|fetch\(|from "@\/repositories\/|Repository\.|Service\./,
  );
  assert.doesNotMatch(card, /Flame|progress|rating|stars/i);
});

test("homepage has a clean reusable top-N popularity contract without duplicated SQL", async () => {
  const [service, repository] = await Promise.all([
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/repositories/board-game-statistics.repository.ts"),
  ]);

  assert.match(service, /listPopularBoardGames/);
  assert.match(service, /boardGameStatisticsRepository\.findPopular/);
  assert.match(repository, /findPopular/);
  assert.equal((repository.match(/completed_borrow_count/g) ?? []).length >= 2, true);
  assert.equal((service.match(/completed_borrow_count/g) ?? []).length, 0);
});

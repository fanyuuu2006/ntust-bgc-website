import assert from "node:assert/strict";
import test from "node:test";
import { load } from "./helpers/load-app-module.mjs";
import { createPublicCacheRuntime } from "./helpers/next-public-cache.mjs";

function setup() {
  const runtime = createPublicCacheRuntime();
  const mocks = { "next/cache": runtime.module, "@/libs/supabase/server": { supabase: {} } };
  return { runtime, mocks, ...load("src/libs/cache/public-data.ts", mocks) };
}

test("real Next cache stores successes, not errors, and each public key has a hard time boundary", async (t) => {
  let now = 0;
  t.mock.method(Date, "now", () => now);
  const { cachePublicData, PUBLIC_CACHE } = setup();
  for (const key of Object.keys(PUBLIC_CACHE)) {
    now = 0;
    let reads = 0, unavailable = false;
    const read = cachePublicData(key, async () => {
      reads++;
      if (unavailable) throw Error("upstream unavailable");
      return { version: reads };
    });
    assert.deepEqual(await read(), { version: 1 });
    unavailable = true;
    now = PUBLIC_CACHE[key].ttl * 1000 - 1;
    assert.deepEqual(await read(), { version: 1 });
    now++;
    await assert.rejects(read, /upstream unavailable/);
    await assert.rejects(read, /upstream unavailable/);
    assert.equal(reads, 3);
    unavailable = false;
    assert.deepEqual(await read(), { version: 4 });
    assert.deepEqual(await read(), { version: 4 });
  }
});

test("announcement edit/unpublish/delete invalidate a warmed preview immediately", async () => {
  const { mocks, runtime } = setup();
  let current = { id: 1, title: "published", content: "text", is_published: true, published_at: "2026-01-01", created_at: "2026-01-01" };
  let reads = 0;
  mocks["@/repositories/announcements.repository"] = { announcementsRepository: {
    findHomepagePreview: async () => { reads++; return current?.is_published ? [current] : []; },
    findById: async () => current,
    updateById: async (_, data) => (current = { ...current, ...data }),
    deleteById: async () => { current = null; },
    create: async (data) => (current = { id: 1, ...data }),
  } };
  const service = load("src/services/announcements/announcements.service.ts", mocks).announcementsService;
  assert.equal((await service.getHomepagePreview())[0].title, "published");
  await service.updateForAdmin(1, { title: "edited", content: "text", is_published: true });
  assert.equal((await service.getHomepagePreview())[0].title, "edited");
  await service.updateForAdmin(1, { title: "edited", content: "text", is_published: false });
  assert.deepEqual(await service.getHomepagePreview(), []);
  await service.createForAdmin("fixture", { title: "new", content: "text", is_published: true });
  assert.equal((await service.getHomepagePreview()).length, 1);
  await service.deleteForAdmin(1);
  assert.deepEqual(await service.getHomepagePreview(), []);
  assert.equal(reads, 5);
  assert.equal(runtime.invalidations.length, 4);
  for (const invalidation of runtime.invalidations) assert.deepEqual(invalidation.profile, { expire: 0 });
});

for (const [kind, plural, repository] of [
  ["Category", "Categories", "board-game-categories"],
  ["Location", "Locations", "board-game-locations"],
]) test(`${plural} CRUD invalidates options and popular previews; rejected write does not invalidate`, async () => {
  const { mocks, runtime } = setup();
  let label = "old", reads = 0, popularReads = 0;
  mocks[`@/repositories/${repository}.repository`] = {
    [`boardGame${plural}Repository`]: {
      findAll: async () => { reads++; return [{ id: "fixture", name: label, description: null }]; },
      findById: async () => ({ id: "fixture" }), existsByName: async () => false,
      create: async (input) => { label = input.name; return input; },
      updateById: async (_, input) => { label = input.name; return input; },
      deleteById: async () => { label = "deleted"; },
    },
  };
  mocks["@/repositories/board-games.repository"] = { boardGamesRepository: { existsByCategoryId: async () => false, existsByLocationId: async () => false } };
  mocks["@/repositories/board-game-statistics.repository"] = { boardGameStatisticsRepository: { findPopular: async () => { popularReads++; return []; } } };
  const service = load("src/services/board-games/board-games.service.ts", mocks).boardGamesService;
  const read = async () => { await service[`list${plural}`](); await service.listPopularBoardGames(); };
  await read(); await read();
  assert.equal(reads, 1); assert.equal(popularReads, 1);
  await service[`create${kind}`]({ name: "new" }); await read();
  await service[`update${kind}`]("fixture", { name: "updated" }); await read();
  await service[`delete${kind}`]("fixture"); await read();
  assert.equal(reads, 4); assert.equal(popularReads, 4);
  assert.equal(runtime.invalidations.length, 6);
  mocks[`@/repositories/${repository}.repository`][`boardGame${plural}Repository`].existsByName = async () => true;
  await assert.rejects(() => service[`create${kind}`]({ name: "duplicate" }));
  assert.equal(runtime.invalidations.length, 6);
});

test("board-game create/edit/delete invalidate popular previews without caching management data", async () => {
  const { mocks, runtime } = setup();
  const id = "00000000-0000-4000-8000-000000000001";
  let game = { id, name: "old", status: "available", inventory_number: 1, category_id: id, location_id: id };
  let reads = 0;
  mocks["@/repositories/board-games.repository"] = { boardGamesRepository: {
    findById: async () => game, existsByInventoryNumber: async () => false,
    create: async (input) => (game = { id, ...input }),
    updateById: async (_, input) => (game = { ...game, ...input }),
    deleteById: async () => { game = null; },
  } };
  mocks["@/repositories/board-game-categories.repository"] = { boardGameCategoriesRepository: { findById: async () => ({ id }) } };
  mocks["@/repositories/board-game-locations.repository"] = { boardGameLocationsRepository: { findById: async () => ({ id }) } };
  mocks["@/repositories/board-game-borrowings.repository"] = { boardGameBorrowingsRepository: { findManyByBoardGameId: async () => [] } };
  mocks["@/repositories/board-game-statistics.repository"] = { boardGameStatisticsRepository: { findPopular: async () => { reads++; return game ? [{ name: game.name }] : []; } } };
  const service = load("src/services/board-games/board-games.service.ts", mocks).boardGamesService;
  await service.listPopularBoardGames();
  await service.createBoardGame({ name: "new", inventory_number: 1, category_id: id, location_id: id });
  assert.equal((await service.listPopularBoardGames())[0].name, "new");
  await service.updateBoardGame(id, { name: "edited" });
  assert.equal((await service.listPopularBoardGames())[0].name, "edited");
  await service.deleteBoardGame(id);
  assert.deepEqual(await service.listPopularBoardGames(), []);
  assert.equal(reads, 4);
  assert.equal(runtime.invalidations.length, 3);
});

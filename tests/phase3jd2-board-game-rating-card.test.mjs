import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("rated card metadata reuses canonical fractional stars and formatter", () => {
  const { BoardGameRatingMetadata } = load(
    "src/components/(public)/board-games/BoardGameRatingMetadata.tsx",
  );
  const html = renderToStaticMarkup(createElement(BoardGameRatingMetadata, {
    stats: { averageRating: 4.56, ratingCount: 15 },
  }));

  assert.match(html, /aria-label="平均評分 4\.6，滿分 5 分，共 15 人評分"/);
  assert.match(html, />4\.6（15）</);
  assert.equal((html.match(/<svg/g) ?? []).length, 10);
  assert.doesNotMatch(html, /熱門度|次借用|popularity|\/ 5/);
});

test("one rating uses natural copy and unrated games omit the row", () => {
  const { BoardGameRatingMetadata } = load(
    "src/components/(public)/board-games/BoardGameRatingMetadata.tsx",
  );
  const one = renderToStaticMarkup(createElement(BoardGameRatingMetadata, {
    stats: { averageRating: 5, ratingCount: 1 },
  }));
  assert.match(one, />5\.0（1）</);

  for (const stats of [
    { averageRating: null, ratingCount: 0 },
    { averageRating: 4.5, ratingCount: 0 },
  ]) {
    assert.equal(renderToStaticMarkup(createElement(BoardGameRatingMetadata, { stats })), "");
  }
});

test("popular and non-popular read models carry one-query rating data", async () => {
  const [repository, migration] = await Promise.all([
    read("src/repositories/board-game-statistics.repository.ts"),
    read("supabase/migrations/202609150003_add_ratings_to_board_game_statistics.sql"),
  ]);

  assert.match(repository, /board_game_popularity_statistics/);
  assert.match(repository, /board_games_with_statistics/);
  assert.ok((repository.match(/average_rating,rating_count,review_count/g) ?? []).length >= 3);
  assert.doesNotMatch(repository, /for \([^)]*boardGame[^)]*\)[\s\S]*?\.from\(/);
  assert.doesNotMatch(repository, /\.sort\(/);
  assert.match(migration, /left join public\.board_game_review_statistics as review/i);
  assert.match(migration, /coalesce\(review\.rating_count, 0\)::bigint as rating_count/i);
  assert.match(migration, /security_invoker\s*=\s*true/i);
  assert.match(migration, /revoke all privileges[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant select[\s\S]*to service_role/i);
  const discoveryView = migration.split("-- 評分排序")[0];
  assert.doesNotMatch(discoveryView, /popularity_score|bayesian|borrowing_heat/);
  assert.match(migration, /create or replace view public\.board_game_popularity_statistics/i);
  assert.match(migration, /bayesian_rating/);
});

test("changing discovery sort preserves the same mapped rating contract", async () => {
  const tables = [];
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "測試桌遊",
    image: null,
    status: "available",
    inventory_number: 1,
    completed_borrow_count: "2",
    average_rating: "4.6",
    rating_count: "15",
    review_count: "8",
    category: { name: "策略" },
    location: { name: "社辦" },
  };
  const query = {
    select() { return this; },
    order() { return this; },
    or() { return this; },
    in() { return this; },
    eq() { return this; },
    async range() { return { data: [row], error: null, count: 1 }; },
  };
  const { boardGameStatisticsRepository } = load(
    "src/repositories/board-game-statistics.repository.ts",
    { "@/libs/supabase/server": { supabase: { from(table) { tables.push(table); return Object.create(query); } } } },
  );

  const popular = await boardGameStatisticsRepository.findMany({ orderBy: "popular" });
  const updated = await boardGameStatisticsRepository.findMany({ orderBy: "updated_at", orderDirection: "desc" });

  assert.deepEqual(popular.data[0].stats, updated.data[0].stats);
  assert.deepEqual(popular.data[0].stats, {
    completedBorrowCount: 2,
    averageRating: 4.6,
    ratingCount: 15,
    reviewCount: 8,
  });
  assert.deepEqual(tables, ["board_game_popularity_statistics", "board_games_with_statistics"]);
});

test("rating sort normalizes from the public URL and stays database-paginated", async () => {
  const { normalizePublicBoardGamesQuery } = load(
    "src/app/(public)/board-games/query.ts",
  );
  assert.deepEqual(
    normalizePublicBoardGamesQuery({ sort: "rating:desc" }).sortOption,
    {
      key: "rating:desc",
      orderBy: "rating",
      orderDirection: "desc",
      label: "評分最高",
    },
  );

  const repository = await read("src/repositories/board-game-statistics.repository.ts");
  const ratingOrder = repository.indexOf('.order("bayesian_rating"');
  const unratedLast = repository.indexOf('nullsFirst: false', ratingOrder);
  const ratingCount = repository.indexOf('.order("rating_count"', ratingOrder);
  const average = repository.indexOf('.order("average_rating"', ratingOrder);
  const borrowing = repository.indexOf('.order("completed_borrow_count"', ratingOrder);
  const id = repository.indexOf('.order("board_game_id"', ratingOrder);
  const pagination = repository.indexOf('.range(from, to)');
  assert.ok(ratingOrder >= 0 && unratedLast > ratingOrder);
  assert.ok(ratingCount > ratingOrder && average > ratingCount);
  assert.ok(borrowing > average && id > borrowing && pagination > id);
  assert.doesNotMatch(repository, /\.sort\(/);
});

test("rating sort applies search and filters before its bounded database range", async () => {
  const calls = [];
  const query = {
    select() { calls.push(["select"]); return this; },
    order(column) { calls.push(["order", column]); return this; },
    or(value) { calls.push(["or", value]); return this; },
    in(column, value) { calls.push(["in", column, value]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    async range(from, to) { calls.push(["range", from, to]); return { data: [], error: null, count: 0 }; },
  };
  const { boardGameStatisticsRepository } = load(
    "src/repositories/board-game-statistics.repository.ts",
    { "@/libs/supabase/server": { supabase: { from(table) { calls.push(["from", table]); return Object.create(query); } } } },
  );
  await boardGameStatisticsRepository.findMany({
    page: 2,
    pageSize: 24,
    orderBy: "rating",
    search: "策略",
    status: "available",
    category_ids: ["category"],
    location_ids: ["location"],
  });

  assert.deepEqual(calls[0], ["from", "board_game_popularity_statistics"]);
  const rangeIndex = calls.findIndex(([operation]) => operation === "range");
  const ratingIndex = calls.findIndex(([, column]) => column === "bayesian_rating");
  for (const operation of ["or", "eq", "in"]) {
    assert.ok(calls.findIndex(([name]) => name === operation) < ratingIndex);
  }
  assert.ok(ratingIndex < rangeIndex);
  assert.deepEqual(calls[rangeIndex], ["range", 24, 47]);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

function setupRepository(globalRank = 17) {
  const calls = [];
  const row = {
    board_game_id: "11111111-1111-4111-8111-111111111111",
    global_rank: globalRank,
    name: "排行桌遊",
    image: null,
    status: "available",
    inventory_number: 1,
    completed_borrow_count: 4,
    average_rating: 4.5,
    rating_count: 6,
    review_count: 3,
    category_name: null,
    location_name: null,
  };
  const builder = {
    select(columns, options) { calls.push(["select", columns, options]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    ilike(column, pattern) { calls.push(["ilike", column, pattern]); return this; },
    gt(column, value) { calls.push(["gt", column, value]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    async range(from, to) { calls.push(["range", from, to]); return { data: [row], error: null, count: 1 }; },
  };
  const repository = load("src/repositories/board-game-statistics.repository.ts", {
    "@/libs/supabase/server": { supabase: { from(table) { calls.push(["from", table]); return builder; } } },
  }).boardGameStatisticsRepository;
  return { repository, calls };
}

test("rankings validate query values and default to popular", () => {
  const { normalizeBoardGameRankingQuery } = load("src/app/(public)/rankings/board-games/query.ts");
  assert.deepEqual(normalizeBoardGameRankingQuery({}), { ranking: { key: "popular", label: "綜合排行", description: "看看哪些桌遊最受大家喜愛！" }, page: 1, search: undefined });
  assert.equal(normalizeBoardGameRankingQuery({ ranking: "reviews", page: "3" }).ranking.key, "reviews");
  assert.equal(normalizeBoardGameRankingQuery({ ranking: "invalid", page: "-2" }).ranking.key, "popular");
  assert.equal(normalizeBoardGameRankingQuery({ ranking: "rating" }).ranking.description, "一起看看大家最推薦哪些桌遊！");
  assert.equal(normalizeBoardGameRankingQuery({ ranking: ["rating", "borrowed"] }).ranking.key, "popular");
  assert.equal(normalizeBoardGameRankingQuery({ q: "  卡坦島  " }).search, "卡坦島");
  assert.equal(normalizeBoardGameRankingQuery({ q: "x".repeat(101) }).search, undefined);
  assert.equal(normalizeBoardGameRankingQuery({ q: ["卡坦島", "璀璨寶石"] }).search, undefined);
});

test("ranking search filters the complete dataset before sorting and pagination", async () => {
  const { repository, calls } = setupRepository(17);
  const result = await repository.findRanked("popular", { page: 2, pageSize: 20, search: "卡坦_50%" });

  const searchIndex = calls.findIndex(([method]) => method === "ilike");
  const orderIndex = calls.findIndex(([method]) => method === "order");
  const rangeIndex = calls.findIndex(([method]) => method === "range");
  assert.ok(searchIndex > -1);
  assert.deepEqual(calls[searchIndex].slice(1), ["name", "%卡坦\\_50\\%%"]);
  assert.ok(searchIndex < orderIndex);
  assert.ok(orderIndex < rangeIndex);
  assert.equal(result.data[0].globalRank, 17);
});

for (const ranking of ["popular", "rating", "reviews", "borrowed"]) {
  test(`${ranking} ranking selects its precomputed global order before pagination`, async () => {
    const { repository, calls } = setupRepository();
    const result = await repository.findRanked(ranking, { page: 2, pageSize: 20 });
    assert.equal(calls[0][1], "board_game_rankings");
    assert.deepEqual(calls.find(([method]) => method === "eq").slice(1), ["ranking", ranking]);
    assert.equal(calls.find(([method]) => method === "order")[1], "global_rank");
    assert.deepEqual(calls.at(-1), ["range", 20, 39]);
    assert.equal(calls.filter(([method]) => method === "range").length, 1);
    assert.equal(calls.filter(([method]) => method === "order").length, 1);
    assert.equal(result.data[0].globalRank, 17);
    assert.equal(result.data[0].stats.reviewCount, 3);
  });
}

test("ranking semantics reuse canonical review, borrowing and Bayesian views", async () => {
  const [migration, reviewsMigration] = await Promise.all([
    source("supabase/migrations/202609150003_add_ratings_to_board_game_statistics.sql"),
    source("supabase/migrations/202609150001_add_board_game_reviews.sql"),
  ]);
  assert.match(migration, /where borrowing\.status in \('borrowed', 'returned'\)/);
  assert.match(reviewsMigration, /count\(\*\) filter \(where review\.content is not null\)::bigint as review_count/);
  assert.match(migration, /rating_count::numeric \+ 5::numeric/);
  assert.match(migration, /0\.50::double precision \* borrowing_heat[\s\S]*0\.35::double precision \* rating_quality[\s\S]*0\.15::double precision \* rating_participation/);
});

test("ranking view computes eligible global ranks with the existing tie-breakers", async () => {
  const [migration, canonical, verification] = await Promise.all([
    source("supabase/migrations/202610220001_add_public_board_game_rankings.sql"),
    source("supabase/schema/canonical-public-schema.sql"),
    source("supabase/verification/verify-public-board-game-rankings.sql"),
  ]);

  assert.match(migration, /create view public\.board_game_rankings[\s\S]*security_invoker = true/);
  assert.match(migration, /'popular'::text[\s\S]*popularity_score desc[\s\S]*rating_count desc[\s\S]*completed_borrow_count desc[\s\S]*average_rating desc nulls last[\s\S]*board_game_id asc[\s\S]*where statistics\.popularity_score > 0/);
  assert.match(migration, /'rating'::text[\s\S]*bayesian_rating desc nulls last[\s\S]*rating_count desc[\s\S]*average_rating desc nulls last[\s\S]*completed_borrow_count desc[\s\S]*board_game_id asc[\s\S]*where statistics\.rating_count > 0/);
  assert.match(migration, /'reviews'::text[\s\S]*review_count desc[\s\S]*rating_count desc[\s\S]*average_rating desc nulls last[\s\S]*board_game_id asc[\s\S]*where statistics\.review_count > 0/);
  assert.match(migration, /'borrowed'::text[\s\S]*completed_borrow_count desc[\s\S]*review_count desc[\s\S]*rating_count desc[\s\S]*board_game_id asc[\s\S]*where statistics\.completed_borrow_count > 0/);
  assert.match(migration, /revoke all privileges[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant select[\s\S]*to service_role/);
  assert.match(canonical, /create view public\.board_game_rankings/);
  assert.match(canonical, /grant select on table public\.board_game_rankings to service_role/);
  assert.match(verification, /matches_existing_order/);
  assert.match(verification, /public\.select/);
});

test("public borrowing ranking uses concise copy without changing its status semantics", async () => {
  const [config, list] = await Promise.all([
    source("src/app/(public)/rankings/ranking-config.ts"),
    source("src/components/(public)/rankings/BoardGameRankingList.tsx"),
  ]);
  assert.match(config, /看看哪些桌遊最常被借走/);
  assert.match(list, /次借用/);
  assert.doesNotMatch(config, /已借出或已歸還的成功借用紀錄/);
  assert.doesNotMatch(list, /次成功借用/);
});

test("public routes expose an extensible hub, four board-game rankings and SSR pagination", async () => {
  const [overview, boardGames, list, genericList, navigation, sitemap] = await Promise.all([
    source("src/app/(public)/rankings/page.tsx"),
    source("src/app/(public)/rankings/board-games/page.tsx"),
    source("src/components/(public)/rankings/BoardGameRankingList.tsx"),
    source("src/components/(public)/rankings/RankingList.tsx"),
    source("src/libs/navigation.tsx"),
    source("src/app/sitemap.ts"),
  ]);
  assert.match(overview, /pageSize: 3/);
  assert.match(overview, /getBoardGameRanking/);
  assert.match(overview, /basePath="\/rankings"/);
  assert.match(overview, /桌遊排行/);
  assert.match(overview, /href="\/rankings\/reviews"/);
  assert.match(overview, /\/rankings\/contributors/);
  assert.doesNotMatch(overview, /\/rankings\/events/);
  assert.match(boardGames, /PaginatedCollection/);
  assert.match(boardGames, /listBoardGameRankings/);
  assert.match(boardGames, /BoardGameRankingSearchForm/);
  assert.match(boardGames, /q: search/);
  assert.match(boardGames, /robots: \{ index: false, follow: true \}/);
  assert.doesNotMatch(boardGames, /Podium|showPodium/);
  assert.match(list, /href: `\/board-games\/\$\{item\.id\}`/);
  assert.match(list, /RatingStars/);
  assert.doesNotMatch(list, /樣本較少/);
  assert.doesNotMatch(genericList, /BoardGame|board-game/);
  assert.match(navigation, /label: "排行", href: "\/rankings"/);
  assert.match(sitemap, /"\/rankings"/);
  assert.match(sitemap, /"\/rankings\/board-games"/);
  assert.match(sitemap, /"\/rankings\/reviews"/);
});

test("ranking list renders empty data safely and keeps rank, metric and detail link explicit", () => {
  const { BoardGameRankingList } = load("src/components/(public)/rankings/BoardGameRankingList.tsx");
  const empty = renderToStaticMarkup(createElement(BoardGameRankingList, { items: [], ranking: "popular" }));
  assert.match(empty, /目前沒有排行榜資料/);

  const html = renderToStaticMarkup(createElement(BoardGameRankingList, {
    ranking: "rating",
    items: [{
      id: "11111111-1111-4111-8111-111111111111",
      name: "測試桌遊",
      image: null,
      status: "available",
      inventory_number: 42,
      category: null,
      location: null,
      stats: { averageRating: 5, ratingCount: 1, reviewCount: 1, completedBorrowCount: 2 },
      globalRank: 21,
    }],
  }));
  assert.match(html, /aria-label="第 21 名"/);
  assert.match(html, /href="\/board-games\/11111111-1111-4111-8111-111111111111"/);
  assert.match(html, /aria-label="平均 5\.0 分，共 1 人評分"/);
  assert.match(html, /5\.0 \(1\)/);
  assert.doesNotMatch(html, /1 則文字評論/);
  assert.doesNotMatch(html, /樣本較少/);
  assert.doesNotMatch(html, /#42/);
});

test("filtered ranking results render their original global ranks across result pages", () => {
  const { BoardGameRankingList } = load("src/components/(public)/rankings/BoardGameRankingList.tsx");
  const base = {
    image: null,
    status: "available",
    inventory_number: 42,
    category: null,
    location: null,
    stats: { averageRating: 4.5, ratingCount: 8, reviewCount: 3, completedBorrowCount: 5 },
  };
  const html = renderToStaticMarkup(createElement(BoardGameRankingList, {
    ranking: "borrowed",
    items: [4, 17, 35].map((globalRank) => ({
      ...base,
      globalRank,
      id: `${globalRank}1111111-1111-4111-8111-111111111111`,
      name: `第 ${globalRank} 名桌遊`,
    })),
  }));

  for (const rank of [4, 17, 35]) {
    assert.match(html, new RegExp(`aria-label="第 ${rank} 名"`));
  }
  assert.doesNotMatch(html, /aria-label="第 1 名"/);
  assert.doesNotMatch(html, /rankOffset/);
});

test("review ranking keeps review count primary and renders rating as a subtle secondary metric", () => {
  const { BoardGameRankingList } = load("src/components/(public)/rankings/BoardGameRankingList.tsx");
  const html = renderToStaticMarkup(createElement(BoardGameRankingList, {
    ranking: "reviews",
    items: [{
      id: "11111111-1111-4111-8111-111111111111",
      name: "評論排行桌遊",
      image: null,
      status: "available",
      inventory_number: 42,
      category: null,
      location: null,
      stats: { averageRating: 4.5, ratingCount: 6, reviewCount: 12, completedBorrowCount: 2 },
      globalRank: 7,
    }],
  }));

  assert.match(html, /12<\/strong> 則文字評論/);
  assert.match(html, /aria-label="平均 4\.5 分，共 6 人評分"/);
  assert.match(html, />4\.5<\/span>/);
  assert.doesNotMatch(html, /4\.5 \(6\)/);
});

test("all ranks use one leaderboard list and the top three keep subtle semantic colors", async () => {
  const { BoardGameRankingList } = load("src/components/(public)/rankings/BoardGameRankingList.tsx");
  const item = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "測試桌遊",
    image: null,
    status: "available",
    inventory_number: 42,
    category: null,
    location: null,
    stats: { averageRating: 4.5, ratingCount: 8, reviewCount: 3, completedBorrowCount: 5 },
    globalRank: 1,
  };
  const html = renderToStaticMarkup(createElement(BoardGameRankingList, {
    ranking: "popular",
    items: [1, 2, 3, 4].map((rank) => ({ ...item, globalRank: rank, id: `${rank}1111111-1111-4111-8111-111111111111` })),
  }));

  for (const rank of [1, 2, 3, 4]) assert.match(html, new RegExp(`aria-label="第 ${rank} 名"`));
  assert.equal((html.match(/href="\/board-games\//g) ?? []).length, 4);
  assert.equal((html.match(/<li/g) ?? []).length, 4);
  assert.match(html, /--status-warning/);
  assert.match(html, /--text-secondary/);
  assert.match(html, /--status-danger/);
  await assert.rejects(source("src/components/(public)/rankings/RankingPodium.tsx"), { code: "ENOENT" });
});

test("ranking controls preserve search and use a single-row scrollable tab layout", async () => {
  const [navigation, searchForm, list] = await Promise.all([
    source("src/components/(public)/rankings/RankingNavigation.tsx"),
    source("src/components/(public)/rankings/BoardGameRankingSearchForm.tsx"),
    source("src/components/(public)/rankings/RankingList.tsx"),
  ]);
  assert.match(navigation, /"use client"/);
  assert.match(navigation, /overflow-x-auto/);
  assert.match(navigation, /\[scrollbar-width:none\]/);
  assert.match(navigation, /\[&::-webkit-scrollbar\]:hidden/);
  assert.match(navigation, /min-w-max flex-nowrap/);
  assert.match(navigation, /min-h-11/);
  assert.match(navigation, /border-b-2/);
  assert.match(navigation, /border-transparent/);
  assert.match(navigation, /scrollIntoView/);
  assert.match(navigation, /inline: "nearest"/);
  assert.match(navigation, /aria-current/);
  assert.doesNotMatch(navigation, /grid-cols-2|sm:flex-wrap|rounded-xl/);
  assert.match(navigation, /params\.set\("q", search\)/);
  assert.match(searchForm, /method="GET"/);
  assert.match(searchForm, /maxLength=\{BOARD_GAME_RANKING_SEARCH_MAX_LENGTH\}/);
  assert.match(searchForm, /name="q"/);
  assert.match(searchForm, /清除搜尋/);
  assert.match(list, /grid-cols-\[2\.5rem_3\.5rem_minmax\(0,1fr\)\]/);
  assert.match(list, /py-3\.5/);
  assert.match(list, /sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(list, /item\.media \?/);
  assert.match(list, /item\.href \?/);
});

test("rankings hub validates its server-side ranking switch", () => {
  const { getBoardGameRanking } = load("src/app/(public)/rankings/ranking-config.ts");
  assert.equal(getBoardGameRanking("rating").key, "rating");
  assert.equal(getBoardGameRanking("reviews").key, "reviews");
  assert.equal(getBoardGameRanking("borrowed").key, "borrowed");
  assert.equal(getBoardGameRanking("missing").key, "popular");
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("review ranking view contains only text reviews and uses the required stable order", async () => {
  const [migration, canonical, verification] = await Promise.all([
    source("supabase/migrations/202610220002_add_public_review_rankings.sql"),
    source("supabase/schema/canonical-public-schema.sql"),
    source("supabase/verification/verify-public-review-rankings.sql"),
  ]);

  assert.match(migration, /create view public\.board_game_review_rankings[\s\S]*security_invoker = true/);
  assert.match(migration, /count\(review_like\.user_id\) desc,[\s\S]*review\.created_at desc,[\s\S]*review\.id desc/);
  assert.match(migration, /where review\.content is not null[\s\S]*btrim\(review\.content\) <> ''/);
  assert.match(migration, /join public\.users as author/);
  assert.match(migration, /join public\.board_games as board_game/);
  assert.match(migration, /revoke all privileges[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant select[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /insert into|update public\.|delete from/);
  assert.match(canonical, /create view public\.board_game_review_rankings/);
  assert.match(verification, /security_invoker/);
  assert.match(verification, /matches_existing_order/);
  assert.match(verification, /text_reviews_only/);
  assert.match(verification, /public\.select/);
});

test("repository reads the ranked view and paginates in global rank order", async () => {
  const calls = [];
  const builder = {
    select(columns, options) { calls.push(["select", columns, options]); return this; },
    ilike(column, pattern) { calls.push(["ilike", column, pattern]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    async range(from, to) {
      calls.push(["range", from, to]);
      return {
        data: [{
          global_rank: 21,
          review_id: "11111111-1111-4111-8111-111111111111",
          board_game_id: "22222222-2222-4222-8222-222222222222",
          board_game_name: "測試桌遊",
          rating: 5,
          content: "很適合聚會。",
          created_at: "2026-10-22T00:00:00.000Z",
          author_id: "33333333-3333-4333-8333-333333333333",
          author_name: "測試使用者",
          author_avatar: null,
          author_closed_at: null,
          like_count: 8,
        }],
        error: null,
        count: 41,
      };
    },
  };
  const repository = load("src/repositories/board-game-reviews.repository.ts", {
    "@/libs/supabase/server": {
      supabase: { from(table) { calls.push(["from", table]); return builder; } },
    },
  }).boardGameReviewsRepository;

  const result = await repository.findPopularRankings({ page: 2, pageSize: 20, search: "50%_推薦" });
  assert.deepEqual(calls[0], ["from", "board_game_review_rankings"]);
  assert.deepEqual(calls.find(([method]) => method === "ilike").slice(1), ["content", "%50\\%\\_推薦%"]);
  assert.deepEqual(calls.find(([method]) => method === "order").slice(1), ["global_rank", { ascending: true }]);
  assert.deepEqual(calls.at(-1), ["range", 20, 39]);
  assert.equal(result.data[0].global_rank, 21);
  assert.equal(result.total, 41);
});

test("review ranking query keeps valid URL search state and rejects overlong values", () => {
  const { normalizeReviewRankingQuery } = load("src/app/(public)/rankings/reviews/query.ts");

  assert.deepEqual(normalizeReviewRankingQuery({ page: "2", q: "  50%_推薦  " }), {
    page: 2,
    search: "50%_推薦",
  });
  assert.deepEqual(normalizeReviewRankingQuery({ page: "invalid", q: "x".repeat(101) }), {
    page: 1,
    search: undefined,
  });
});

test("review ranking UI shows public identity, game, rating, likes, date and canonical deep link", () => {
  const { ReviewRankingList } = load("src/components/(public)/rankings/ReviewRankingList.tsx");
  const id = "11111111-1111-4111-8111-111111111111";
  const gameId = "22222222-2222-4222-8222-222222222222";
  const html = renderToStaticMarkup(createElement(ReviewRankingList, {
    items: [{
      globalRank: 4,
      id,
      boardGame: { id: gameId, name: "測試桌遊" },
      rating: 5,
      content: "很適合聚會。",
      createdAt: "2026-10-22T00:00:00.000Z",
      likeCount: 8,
      author: { id: "33333333-3333-4333-8333-333333333333", name: "測試使用者", avatar: null },
    }],
  }));

  assert.match(html, /aria-label="第 4 名"/);
  assert.match(html, /很適合聚會/);
  assert.match(html, /測試使用者/);
  assert.match(html, /測試桌遊/);
  assert.match(html, /aria-label="5 分"/);
  assert.match(html, /aria-label="8 個讚"/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /line-clamp-2/);
  assert.match(html, /text-\(--text-primary\)/);
  assert.match(html, new RegExp(`href="/board-games/${gameId}\\?review=${id}&amp;reviewSort=newest#review-${id}"`));
});

test("review ranking compact preview truncates to one line while keeping the same row structure", () => {
  const { ReviewRankingList } = load("src/components/(public)/rankings/ReviewRankingList.tsx");
  const html = renderToStaticMarkup(createElement(ReviewRankingList, {
    compact: true,
    items: [{
      globalRank: 1,
      id: "11111111-1111-4111-8111-111111111111",
      boardGame: { id: "22222222-2222-4222-8222-222222222222", name: "測試桌遊" },
      rating: 5,
      content: "這是一段很長的評論摘要。",
      createdAt: "2026-10-22T00:00:00.000Z",
      likeCount: 9,
      author: { id: "33333333-3333-4333-8333-333333333333", name: "測試使用者", avatar: null },
    }],
  }));

  assert.match(html, /line-clamp-1/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /aria-label="9 個讚"/);
});

test("review ranking route is searchable, SSR paginated and discoverable without fake ranking routes", async () => {
  const [page, query, searchForm, overview, sitemap] = await Promise.all([
    source("src/app/(public)/rankings/reviews/page.tsx"),
    source("src/app/(public)/rankings/reviews/query.ts"),
    source("src/components/(public)/rankings/ReviewRankingSearchForm.tsx"),
    source("src/app/(public)/rankings/page.tsx"),
    source("src/app/sitemap.ts"),
  ]);
  assert.match(page, /reviewsService\.listPopularRankings/);
  assert.match(page, /PaginatedCollection/);
  assert.match(page, /basePath="\/rankings\/reviews"/);
  assert.match(page, /listPopularRankings\(\{ page, pageSize: PAGE_SIZE, search \}\)/);
  assert.match(page, /query=\{\{ q: search \}\}/);
  assert.match(page, /robots: \{ index: false, follow: true \}/);
  assert.match(query, /REVIEW_RANKING_SEARCH_MAX_LENGTH = 100/);
  assert.match(searchForm, /搜尋評論內容/);
  assert.match(searchForm, /清除搜尋/);
  assert.match(overview, /reviewsService\.listPopularRankings\(\{ page: 1, pageSize: 3 \}\)/);
  assert.match(overview, /ReviewRankingList items=\{reviewResult\.data\} compact/);
  assert.match(overview, /href="\/rankings\/reviews"/);
  assert.match(overview, /\/rankings\/contributors/);
  assert.doesNotMatch(overview, /\/rankings\/events/);
  assert.match(sitemap, /"\/rankings\/reviews"/);
});

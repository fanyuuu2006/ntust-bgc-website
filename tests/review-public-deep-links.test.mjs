import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const firstReviewId = "11111111-1111-4111-8111-111111111111";
const secondReviewId = "22222222-2222-4222-8222-222222222222";
const boardGameId = "33333333-3333-4333-8333-333333333333";

test("public review query validates permalink identity independently from page position", () => {
  const { normalizeBoardGameReviewQuery, shouldCorrectReviewPermalink } = load(
    "src/app/(public)/board-games/[id]/review-query.ts",
  );

  assert.deepEqual(normalizeBoardGameReviewQuery({ review: firstReviewId, reviewPage: "99", reviewSort: "oldest" }), {
    page: 99,
    pageSize: 10,
    search: undefined,
    rating: undefined,
    sort: "oldest",
    targetReviewId: firstReviewId,
  });
  assert.equal(normalizeBoardGameReviewQuery({ review: "invalid" }).targetReviewId, null);
  assert.equal(normalizeBoardGameReviewQuery({}).targetReviewId, undefined);

  assert.equal(shouldCorrectReviewPermalink({ reviewPage: "2", reviewSort: "newest" }, { page: 2 }), false);
  assert.equal(shouldCorrectReviewPermalink({ reviewPage: "1", reviewSort: "newest" }, { page: 2 }), true);
  assert.equal(shouldCorrectReviewPermalink({ reviewPage: "2", reviewSort: "oldest" }, { page: 2 }), true);
  assert.equal(shouldCorrectReviewPermalink({ reviewPage: "2", reviewSort: "newest", reviewSearch: "x" }, { page: 2 }), true);
});

test("repository scopes a target to its Board Game and counts canonical-newest predecessors", async () => {
  const calls = [];
  const targetBuilder = {
    select(columns) { calls.push(["target-select", columns]); return this; },
    eq(column, value) { calls.push(["target-eq", column, value]); return this; },
    maybeSingle() { return Promise.resolve({ data: { id: firstReviewId, created_at: "2026-10-01T00:00:00Z" }, error: null }); },
  };
  const countBuilder = {
    select(columns, options) { calls.push(["count-select", columns, options]); return this; },
    eq(column, value) { calls.push(["count-eq", column, value]); return this; },
    or(expression) { calls.push(["count-or", expression]); return Promise.resolve({ count: 10, error: null }); },
  };
  let query = 0;
  const { boardGameReviewsRepository } = load("src/repositories/board-game-reviews.repository.ts", {
    "@/libs/supabase/server": { supabase: { from: () => query++ === 0 ? targetBuilder : countBuilder } },
  });

  assert.equal(await boardGameReviewsRepository.findPublicNewestPosition(boardGameId, firstReviewId), 10);
  assert.deepEqual(calls.filter(([name]) => name === "target-eq"), [
    ["target-eq", "board_game_id", boardGameId],
    ["target-eq", "id", firstReviewId],
  ]);
  assert.deepEqual(calls.find(([name]) => name === "count-select"), ["count-select", "id", { count: "exact", head: true }]);
  assert.equal(
    calls.find(([name]) => name === "count-or")[1],
    `created_at.gt.2026-10-01T00:00:00Z,and(created_at.eq.2026-10-01T00:00:00Z,id.gt.${firstReviewId})`,
  );
});

test("repository returns unavailable without a position query for missing or wrong-board reviews", async () => {
  let fromCalls = 0;
  const targetBuilder = {
    select() { return this; },
    eq() { return this; },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
  };
  const { boardGameReviewsRepository } = load("src/repositories/board-game-reviews.repository.ts", {
    "@/libs/supabase/server": { supabase: { from: () => { fromCalls += 1; return targetBuilder; } } },
  });
  assert.equal(await boardGameReviewsRepository.findPublicNewestPosition(boardGameId, firstReviewId), null);
  assert.equal(fromCalls, 1);
});

test("service derives first, later and boundary pages while validating UUIDs", async () => {
  let preceding = 0;
  const { reviewsService } = load("src/services/reviews/reviews.service.ts", {
    "@/repositories/board-game-reviews.repository": {
      boardGameReviewsRepository: { findPublicNewestPosition: async () => preceding },
    },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
    "@/libs/cache/public-data": { invalidatePublicDataSafely() {} },
  });

  assert.deepEqual(await reviewsService.resolvePublicNewestLocation(boardGameId, firstReviewId, 10), { reviewId: firstReviewId, page: 1 });
  preceding = 9;
  assert.equal((await reviewsService.resolvePublicNewestLocation(boardGameId, firstReviewId, 10)).page, 1);
  preceding = 10;
  assert.equal((await reviewsService.resolvePublicNewestLocation(boardGameId, firstReviewId, 10)).page, 2);
  preceding = 27;
  assert.equal((await reviewsService.resolvePublicNewestLocation(boardGameId, firstReviewId, 10)).page, 3);
  preceding = null;
  assert.equal(await reviewsService.resolvePublicNewestLocation(boardGameId, firstReviewId, 10), null);
  await assert.rejects(() => reviewsService.resolvePublicNewestLocation(boardGameId, "invalid", 10));
});

test("public reviews render stable anchors, target state and a private-safe unavailable message", () => {
  const { BoardGameReviews } = load("src/components/(public)/board-games/BoardGameReviews.tsx", {
    "next/navigation": { useRouter: () => ({ push() {}, replace() {} }) },
  });
  const html = renderToStaticMarkup(createElement(BoardGameReviews, {
    boardGameId,
    aggregate: { averageRating: 5, ratingCount: 1, reviewCount: 1 },
    reviews: {
      data: [{ id: firstReviewId, rating: 5, content: "public", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", author: { id: "author", name: "Author", avatar: null } }],
      page: 1, pageSize: 10, total: 1, totalPages: 1,
    },
    query: { page: 1, pageSize: 10, sort: "newest" },
    targetReviewId: firstReviewId,
    targetUnavailable: true,
  }));

  assert.match(html, new RegExp(`id="review-${firstReviewId}"`));
  assert.match(html, /aria-current="true"/);
  assert.match(html, /scroll-mt-24/);
  assert.match(html, /找不到可公開的指定評論/);
  assert.doesNotMatch(html, new RegExp(secondReviewId));
});

test("Admin desktop and mobile expose explicit public actions without replacing Admin entity links", async () => {
  const source = await read("src/components/(admin)/admin/reviews/AdminReviewRecords.tsx");
  const page = await read("src/app/(public)/board-games/[id]/page.tsx");
  assert.match(source, /AdminBoardGameLink/);
  assert.equal((source.match(/查看公開評論/g) ?? []).length, 2);
  assert.match(source, /`\/board-games\/\$\{review\.boardGame\.id\}\?review=\$\{review\.id\}&reviewSort=newest#review-\$\{review\.id\}`/);
  assert.match(page, /reviewPage: targetLocation\.page/);
  assert.match(page, /#review-\$\{targetLocation\.reviewId\}/);
  assert.match(page, /shouldCorrectReviewPermalink/);
  assert.match(page, /resolvePublicNewestLocation/);
  assert.doesNotMatch(source, /returnTo=/);
});

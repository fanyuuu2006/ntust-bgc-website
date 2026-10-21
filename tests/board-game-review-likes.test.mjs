import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { JSDOM } from "jsdom";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const userId = "11111111-1111-4111-8111-111111111111";
const gameId = "22222222-2222-4222-8222-222222222222";
const reviewId = "33333333-3333-4333-8333-333333333333";

test("review-like migration enforces uniqueness, cascades cleanup, and server-only execution", async () => {
  const sql = await read("supabase/migrations/202610210002_add_board_game_review_likes.sql");
  assert.match(sql, /primary key \(review_id, user_id\)/);
  assert.equal((sql.match(/on delete cascade/g) ?? []).length, 2);
  assert.match(sql, /on conflict \(review_id, user_id\) do nothing/);
  assert.match(sql, /for key share/);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/);
  assert.match(sql, /p_sort not in \('popular', 'newest', 'oldest', 'highest', 'lowest'\)/);
  assert.match(sql, /row_number\(\) over[\s\S]*like_count end desc[\s\S]*created_at end desc[\s\S]*id desc/);
  assert.match(sql, /offset p_offset limit p_limit/);
  assert.equal((sql.match(/grant execute on function/g) ?? []).length, 2);
  assert.equal((sql.match(/to service_role/g) ?? []).length, 3);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to (anon|authenticated)/);
});

test("public review query defaults to popular while profile and Admin defaults remain newest", () => {
  const { listReviewsSchema, profileReviewsQuerySchema, adminReviewsQuerySchema, setReviewLikeSchema } = load(
    "src/services/reviews/reviews.schema.ts",
  );
  assert.equal(listReviewsSchema.parse({}).sort, "popular");
  assert.equal(profileReviewsQuerySchema.parse({}).sort, "newest");
  assert.equal(adminReviewsQuerySchema.parse({}).sort, "newest");
  assert.deepEqual(setReviewLikeSchema.parse({ liked: true }), { liked: true });
  assert.throws(() => setReviewLikeSchema.parse({ liked: true, user_id: userId }));
});

test("service validates identity, forwards desired state, and maps missing reviews safely", async () => {
  class RepositoryError extends Error { constructor(cause) { super("repository"); this.cause = cause; } }
  class ReviewNotFoundError extends Error {}
  const calls = [];
  const repository = {
    setLike: async (...args) => {
      calls.push(args);
      return { review_id: reviewId, like_count: "7", liked_by_me: args[3] };
    },
  };
  const { reviewsService } = load("src/services/reviews/reviews.service.ts", {
    "@/repositories/shared/errors": { RepositoryError },
    "@/repositories/board-game-reviews.repository": { boardGameReviewsRepository: repository },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
    "@/services/board-games/board-games.errors": { BoardNotFoundError: class extends Error {} },
    "@/services/users/public-identity": { toPublicUserIdentity: (value) => value },
    "./reviews.errors": { DuplicateReviewError: class extends Error {}, ReviewNotFoundError },
    "@/libs/cache/public-data": { invalidatePublicDataSafely() {} },
  });
  assert.deepEqual(await reviewsService.setLike(userId, gameId, reviewId, { liked: true }), {
    reviewId, likeCount: 7, likedByMe: true,
  });
  assert.deepEqual(calls[0], [gameId, reviewId, userId, true]);
  repository.setLike = async () => { throw new RepositoryError({ code: "P0002", message: "REVIEW_NOT_FOUND" }); };
  await assert.rejects(() => reviewsService.setLike(userId, gameId, reviewId, { liked: false }), ReviewNotFoundError);
  await assert.rejects(() => reviewsService.setLike("forged", gameId, reviewId, { liked: true }));
});

test("like route uses the verified server-session identity", async () => {
  const calls = [];
  const route = load("src/app/api/board-games/[id]/reviews/[reviewId]/like/route.ts", {
    "@/libs/api/verified-authorization": { authorizeVerifiedRequest: async () => ({ user: { id: userId }, response: null }) },
    "@/libs/api/server-response": { unexpectedErrorResponse: (_context, _error, message) => Response.json({ message }, { status: 500 }) },
    "@/services/reviews/reviews.errors": { ReviewNotFoundError: class extends Error {} },
    "@/services/reviews/reviews.service": { reviewsService: { setLike: async (...args) => { calls.push(args); return { reviewId, likeCount: 1, likedByMe: true }; } } },
  });
  const response = await route.PUT(new Request("https://example.test", { method: "PUT", body: JSON.stringify({ liked: true }) }), {
    params: Promise.resolve({ id: gameId, reviewId }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calls[0], [userId, gameId, reviewId, { liked: true }]);
});

test("like control exposes count and pressed state without hard-coded theme colors", async () => {
  const { ReviewLikeButton } = load("src/components/(public)/board-games/ReviewLikeButton.tsx", {
    "@/libs/api/client": { apiClient: async () => { throw new Error("must not mutate while rendering"); } },
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
  });
  const liked = renderToStaticMarkup(createElement(ReviewLikeButton, {
    boardGameId: gameId, reviewId, initialLikeCount: 12, initialLikedByMe: true, eligibility: "verified",
  }));
  assert.match(liked, /aria-pressed="true"/);
  assert.match(liked, />12</);
  assert.match(liked, /fill="currentColor"/);
  assert.match(liked, /min-h-11/);
  assert.match(liked, /min-w-11/);
  const anonymous = renderToStaticMarkup(createElement(ReviewLikeButton, {
    boardGameId: gameId, reviewId, initialLikeCount: 2, initialLikedByMe: false, eligibility: "anonymous",
  }));
  assert.match(anonymous, /disabled=""/);
  assert.match(anonymous, /登入後可按讚/);
  const source = await read("src/components/(public)/board-games/ReviewLikeButton.tsx");
  assert.doesNotMatch(source, /dark:|#[0-9a-f]{3,8}/i);
});

test("catalog verification covers RLS, privileges, keys, cascades, and indexes", async () => {
  const sql = await read("supabase/verification/verify-board-game-review-likes.sql");
  assert.match(sql, /relrowsecurity as rls_enabled/);
  assert.match(sql, /has_table_privilege\('service_role'/);
  assert.match(sql, /has_table_privilege\('anon'/);
  assert.match(sql, /has_table_privilege\('authenticated'/);
  assert.match(sql, /acl\.grantee = 0/);
  assert.match(sql, /pg_get_constraintdef/);
  assert.match(sql, /confdeltype = 'c'/);
  assert.match(sql, /pg_indexes/);
  assert.match(sql, /indisvalid/);
});

test("verified like interaction submits once, applies the authoritative response, and refreshes ordering", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", { pretendToBeVisual: true });
  const previous = { window: globalThis.window, document: globalThis.document, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const calls = [];
  let refreshes = 0;
  const { ReviewLikeButton } = load("src/components/(public)/board-games/ReviewLikeButton.tsx", {
    "@/libs/api/client": { apiClient: async (...args) => {
      calls.push(args);
      return { data: { reviewId, likeCount: 4, likedByMe: true } };
    } },
    "next/navigation": { useRouter: () => ({ refresh() { refreshes += 1; } }) },
  });
  const rootNode = createRoot(dom.window.document.getElementById("app"));
  try {
    await act(async () => rootNode.render(createElement(ReviewLikeButton, {
      boardGameId: gameId, reviewId, initialLikeCount: 3, initialLikedByMe: false, eligibility: "verified",
    })));
    const button = dom.window.document.querySelector("button");
    await act(async () => button.click());
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], [`/api/board-games/${gameId}/reviews/${reviewId}/like`, { method: "PUT", body: { liked: true } }]);
    assert.equal(button.getAttribute("aria-pressed"), "true");
    assert.match(button.textContent, /4/);
    assert.equal(refreshes, 1);
  } finally {
    await act(async () => rootNode.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.IS_REACT_ACT_ENVIRONMENT;
    dom.window.close();
  }
});

test("deep links retain canonical newest positioning while normal browsing defaults to popular", async () => {
  const [page, admin, query] = await Promise.all([
    read("src/app/(public)/board-games/[id]/page.tsx"),
    read("src/components/(admin)/admin/reviews/AdminReviewRecords.tsx"),
    read("src/app/(public)/board-games/[id]/review-query.ts"),
  ]);
  assert.match(admin, /reviewSort=newest/);
  assert.match(page, /sort: "newest" as const/);
  assert.match(page, /reviewSort: "newest"/);
  assert.match(query, /listReviewsSchema/);
});

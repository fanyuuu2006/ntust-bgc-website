import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { JSDOM } from "jsdom";

import { load } from "./helpers/load-app-module.mjs";

const gameId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
const reviewPage = {
  data: [{
    id: "review",
    rating: 5,
    content: null,
    createdAt: "2026-09-16T00:00:00Z",
    updatedAt: "2026-09-16T00:00:00Z",
    boardGame: { id: gameId, name: "測試桌遊" },
  }],
  page: 1,
  pageSize: 10,
  total: 1,
  totalPages: 1,
};

test("Profile Reviews query normalization is shared, scoped, bounded, and defaults safely", () => {
  const { normalizeProfileReviewsQuery } = load("src/services/reviews/review-query.ts");
  assert.deepEqual(normalizeProfileReviewsQuery({
    reviewSearch: "  策略  ", reviewRating: "5", reviewSort: "lowest", reviewPage: "3",
  }), { page: 3, pageSize: 10, search: "策略", rating: 5, sort: "lowest" });
  assert.deepEqual(normalizeProfileReviewsQuery({
    reviewSearch: "  ", reviewRating: "9", reviewSort: "invalid", reviewPage: "0",
  }), { page: 1, pageSize: 10, search: undefined, rating: undefined, sort: "newest" });
  assert.equal(normalizeProfileReviewsQuery({ reviewSearch: "x".repeat(101) }).search, undefined);
});

test("scoped Review filter navigation resets only reviewPage and preserves other Review state", () => {
  const { buildOwnedQueryHref } = load("src/libs/query-navigation.ts");
  const href = buildOwnedQueryHref({
    basePath: "/profile",
    appliedQuery: { reviewSearch: "策略", reviewRating: 5, reviewSort: "highest", reviewPage: 4 },
    ownedKeys: ["reviewRating"],
    changes: { reviewRating: 4 },
    pageKey: "reviewPage",
  });
  const url = new URL(href, "https://example.test");
  assert.equal(url.searchParams.get("reviewPage"), "1");
  assert.equal(url.searchParams.get("reviewSearch"), "策略");
  assert.equal(url.searchParams.get("reviewRating"), "4");
  assert.equal(url.searchParams.get("reviewSort"), "highest");
  assert.equal(url.searchParams.has("page"), false);
});

test("Review applied-condition state ignores sort and page while clear preserves sort and returnTo", () => {
  const {
    hasReviewCriteria,
    hasReviewAppliedConditions,
    ReviewQueryControls,
  } = load("src/components/(public)/reviews/ReviewQueryControls.tsx", {
    "next/navigation": { useRouter: () => ({ push: () => {} }) },
  });

  const defaultQuery = { page: 1, pageSize: 10, search: undefined, rating: undefined, sort: "newest" };
  assert.equal(hasReviewCriteria(defaultQuery), false);
  assert.equal(hasReviewAppliedConditions(defaultQuery), false);
  assert.equal(hasReviewAppliedConditions({ ...defaultQuery, page: 3 }), false);
  assert.equal(hasReviewAppliedConditions({ ...defaultQuery, sort: "oldest" }), false);
  assert.equal(hasReviewAppliedConditions({ ...defaultQuery, search: "策略" }), true);
  assert.equal(hasReviewAppliedConditions({ ...defaultQuery, rating: 5 }), true);
  assert.equal(hasReviewAppliedConditions({ ...defaultQuery, search: "策略", rating: 5 }), true);

  const sortOnly = renderToStaticMarkup(createElement(ReviewQueryControls, {
    basePath: "/profile",
    query: { ...defaultQuery, sort: "oldest" },
    searchPlaceholder: "搜尋",
    searchLabel: "搜尋評價",
  }));
  assert.doesNotMatch(sortOnly, /已套用查詢條件|清除條件/);

  const filtered = renderToStaticMarkup(createElement(ReviewQueryControls, {
    basePath: `/board-games/${gameId}`,
    query: { ...defaultQuery, page: 2, search: "策略", rating: 5, sort: "oldest" },
    searchPlaceholder: "搜尋",
    searchLabel: "搜尋評價",
    preservedQuery: { returnTo: "/board-games?page=4&sort=rating:desc" },
    anchor: "board-game-reviews",
  }));
  const document = new JSDOM(filtered).window.document;
  const clear = [...document.querySelectorAll("a")].find((link) => link.textContent === "清除條件");
  assert.ok(clear);
  const clearUrl = new URL(clear.getAttribute("href"), "https://example.test");
  assert.equal(clearUrl.searchParams.get("reviewSort"), "oldest");
  assert.equal(clearUrl.searchParams.get("returnTo"), "/board-games?page=4&sort=rating:desc");
  assert.equal(clearUrl.searchParams.has("reviewSearch"), false);
  assert.equal(clearUrl.searchParams.has("reviewRating"), false);
  assert.equal(clearUrl.searchParams.has("reviewPage"), false);
  assert.equal(clearUrl.hash, "#board-game-reviews");
});

test("My Reviews repository searches Board Game names and content set-wise, then filters and sorts in DB", async () => {
  const calls = [];
  const boardGameQuery = {
    select(value) { calls.push(["game-select", value]); return this; },
    async or(value) { calls.push(["game-or", value]); return { data: [{ id: gameId }], error: null }; },
  };
  const reviewQuery = {
    select(value, options) { calls.push(["review-select", value, options]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    or(value) { calls.push(["review-or", value]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    async range(from, to) { calls.push(["range", from, to]); return { data: [], count: 0, error: null }; },
  };
  const { boardGameReviewsRepository } = load("src/repositories/board-game-reviews.repository.ts", {
    "@/libs/supabase/server": { supabase: { from(table) { calls.push(["from", table]); return table === "board_games" ? boardGameQuery : reviewQuery; } } },
  });
  await boardGameReviewsRepository.findPublicPageByUser(userId, { page: 2, pageSize: 10, search: "策略", rating: 4, sort: "highest" });
  assert.deepEqual(calls.filter(([name]) => name === "from"), [["from", "board_games"], ["from", "board_game_reviews"]]);
  assert.match(calls.find(([name]) => name === "game-or")[1], /name\.ilike/);
  assert.match(calls.find(([name]) => name === "review-or")[1], /content\.ilike/);
  assert.match(calls.find(([name]) => name === "review-or")[1], /board_game_id\.in/);
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "rating" && call[2] === 4));
  assert.deepEqual(calls.filter(([name]) => name === "order").map((call) => call.slice(1)), [
    ["rating", { ascending: false }],
    ["created_at", { ascending: false }],
    ["id", { ascending: false }],
  ]);
  assert.deepEqual(calls.find(([name]) => name === "range"), ["range", 10, 19]);
});

test("My Reviews newest, oldest, highest, and lowest sorts use deterministic DB ordering", async () => {
  const expected = {
    newest: [["created_at", false], ["id", false]],
    oldest: [["created_at", true], ["id", true]],
    highest: [["rating", false], ["created_at", false], ["id", false]],
    lowest: [["rating", true], ["created_at", false], ["id", false]],
  };
  for (const sort of Object.keys(expected)) {
    const orders = [];
    const query = {
      select() { return this; },
      eq() { return this; },
      order(column, options) { orders.push([column, options.ascending]); return this; },
      async range() { return { data: [], count: 0, error: null }; },
    };
    const { boardGameReviewsRepository } = load("src/repositories/board-game-reviews.repository.ts", {
      "@/libs/supabase/server": { supabase: { from: () => query } },
    });
    await boardGameReviewsRepository.findPublicPageByUser(userId, { page: 1, pageSize: 10, sort });
    assert.deepEqual(orders, expected[sort], sort);
  }
});

test("My Reviews service preserves normalized numeric rating and public-safe projection", async () => {
  let received;
  const { reviewsService } = load("src/services/reviews/reviews.service.ts", {
    "@/repositories/board-game-reviews.repository": { boardGameReviewsRepository: {
      findPublicPageByUser: async (_userId, options) => {
        received = options;
        return { page: 1, pageSize: 10, total: 1, totalPages: 1, data: [{
          id: "review", user_id: userId, board_game_id: gameId, rating: 5, content: null,
          created_at: "created", updated_at: "updated",
          board_game: { id: gameId, name: "測試桌遊", internal: "private" },
        }] };
      },
    } },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
  });
  const result = await reviewsService.listPublicByUser(userId, { page: 1, pageSize: 10, rating: 5, sort: "highest" });
  assert.equal(received.rating, 5);
  assert.equal(received.sort, "highest");
  assert.deepEqual(result.data[0], {
    id: "review", rating: 5, content: null, createdAt: "created", updatedAt: "updated",
    boardGame: { id: gameId, name: "測試桌遊" },
  });
});

test("My Reviews management renders result state, scoped controls, owner actions, and scoped pagination", () => {
  const { MyProfileReviews } = load("src/components/(authenticated)/profile/MyProfileReviews.tsx", {
    "next/navigation": { useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }) },
  });
  const reviews = { ...reviewPage, total: 11, totalPages: 2 };
  const html = renderToStaticMarkup(createElement(MyProfileReviews, {
    reviews,
    query: { page: 1, pageSize: 10, search: "策略", rating: 5, sort: "highest" },
    canManage: true,
  }));
  assert.match(html, /找到 11 筆評價/);
  assert.match(html, /name="reviewSearch"/);
  assert.match(html, /aria-label="評分篩選"/);
  assert.match(html, /評分最高/);
  assert.match(html, /aria-label="評論操作"/);
  assert.match(html, /reviewPage=2/);
  assert.doesNotMatch(html, /name="page"/);

  const empty = renderToStaticMarkup(createElement(MyProfileReviews, {
    reviews: { ...reviewPage, data: [], total: 0, totalPages: 0 },
    query: { page: 1, pageSize: 10, search: "不存在", rating: undefined, sort: "newest" },
    canManage: true,
  }));
  assert.match(empty, /找不到符合條件的評價/);
});

test("authenticated profile reuses the bounded profile Review history query", async () => {
  const calls = [];
  const page = load("src/app/(authenticated)/profile/page.tsx", {
    "@/libs/observability/server-render": { withServerErrorReference: (component) => component },
    "@/libs/auth": { getCurrentUser: async () => ({ id: userId, email: "member@example.test", name: "會員", avatar: null, email_verified_at: "2026-09-01T00:00:00Z" }) },
    "@/services/users/users.service": { usersService: { getProfile: async () => ({ real_name: "會員" }) } },
    "@/services/board-games/board-games.service": { boardGamesService: { getTotalBorrowedCount: async () => 0 } },
    "@/services/events/events.service": { eventsService: { getAttendedCountByCurrentAcademicYear: async () => 0 } },
    "@/services/profile/profile.service": { profileService: { getClubContext: async () => ({ identityBadges: [], joinedAcademicYear: null, currentMembership: null, hasMembershipHistory: false }) } },
    "@/services/reviews/reviews.service": { reviewsService: { listPublicByUser: async (...args) => { calls.push(args); return reviewPage; } } },
    "@/components/(authenticated)/profile/ProfileHeroSection": { ProfileHeroSection: () => createElement("div") },
    "@/components/(authenticated)/profile/ProfileClubFootprint": { ProfileClubFootprint: () => createElement("div") },
    "@/components/(authenticated)/profile/ProfileDetailsSection": { ProfileDetailsSection: () => createElement("div") },
    "@/components/(authenticated)/profile/MyProfileReviews": { MyProfileReviews: (props) => createElement("div", { "data-manage-own": String(props.canManage), "data-user": userId }) },
  });

  const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({ reviewPage: "1" }) }));
  assert.deepEqual(calls, [[userId, { page: 1, pageSize: 10, search: undefined, rating: undefined, sort: "newest" }]]);
  assert.match(html, /data-manage-own="true"/);
  assert.match(html, new RegExp(`data-user="${userId}"`));
});

test("profile Review items layer owner actions only when the management composition requests them", () => {
  const { ProfileReviewItems } = load("src/components/(public)/profile/ProfileReviews.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => {} }) },
  });
  const own = renderToStaticMarkup(createElement(ProfileReviewItems, {
    reviews: reviewPage,
    renderActions: (review) => createElement("button", { "aria-label": "評論操作", "data-review": review.id }),
  }));
  assert.match(own, /href="\/board-games\//);
  assert.match(own, /aria-label="評論操作"/);
  assert.doesNotMatch(own, /只有評分|沒有留下評論|尚無文字內容/);

  const publicView = renderToStaticMarkup(createElement(ProfileReviewItems, { reviews: reviewPage }));
  assert.doesNotMatch(publicView, /aria-label="評論操作"/);
  assert.doesNotMatch(publicView, /搜尋我的評價|評分篩選/);
});

test("member borrowing and dashboard identities link to the existing Board Game id", () => {
  const borrowing = {
    id: "borrowing",
    status: "returned",
    created_at: "2026-09-16T00:00:00Z",
    due_at: null,
    returned_at: null,
    board_game: { id: gameId, name: "測試桌遊", inventory_number: 8, image: null },
  };
  const { BorrowingRecord } = load("src/components/(authenticated)/borrowings/BorrowingRecord.tsx");
  const { DashboardBorrowingSummary } = load("src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx");
  for (const html of [
    renderToStaticMarkup(createElement(BorrowingRecord, { borrowing })),
    renderToStaticMarkup(createElement(DashboardBorrowingSummary, { borrowings: [borrowing] })),
  ]) {
    assert.match(html, new RegExp(`href="/board-games/${gameId}(?:\\?returnTo=[^"]+)?"`));
    assert.match(html, /測試桌遊/);
  }
});

test("Admin borrowing desktop and mobile presentations use the same Board Game link without wrapping workflow actions", () => {
  const borrowing = {
    id: "borrowing",
    status: "pending",
    created_at: "2026-09-16T00:00:00Z",
    borrowed_at: null,
    due_at: null,
    returned_at: null,
    approved_by_user_id: null,
    is_current_academic_year_member: true,
    board_game: { id: gameId, name: "測試桌遊", inventory_number: 8, image: null },
    user: { id: userId, name: "會員", email: "member@example.test" },
    user_profile: { real_name: "會員" },
    approved_by_user: null,
    approved_by_user_profile: null,
  };
  const { AdminBorrowingList } = load("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx", {
    "next/navigation": { useRouter: () => ({ push: () => {}, refresh: () => {} }) },
  });
  const html = renderToStaticMarkup(createElement(AdminBorrowingList, { borrowings: [borrowing], query: {} }));
  assert.ok((html.match(new RegExp(`href="/board-games/${gameId}\\?returnTo=`, "g")) ?? []).length >= 2);
  const anchors = [...new JSDOM(html).window.document.querySelectorAll(`a[href^="/board-games/${gameId}?returnTo="]`)];
  assert.equal(anchors.some((anchor) => anchor.querySelector("button")), false);
});

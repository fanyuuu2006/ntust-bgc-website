import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";

const VALID_REGISTRATION = {
  email: "member@example.com",
  name: "member-name",
  real_name: "王小明",
  phone: "0912345678",
  password: "Password1!",
  confirmPassword: "Password1!",
  acceptTerms: true,
};

function registerSchema() {
  return load("src/services/auth/auth.schema.tsx").registerSchema;
}

test("registration schema attaches every correction to its actionable field", () => {
  const schema = registerSchema();
  for (const [change, field] of [
    [{ email: "bad" }, "email"],
    [{ name: "" }, "name"],
    [{ real_name: "" }, "real_name"],
    [{ phone: "" }, "phone"],
    [{ password: "weak", confirmPassword: "weak" }, "password"],
    [{ password: VALID_REGISTRATION.email, confirmPassword: VALID_REGISTRATION.email }, "password"],
    [{ password: VALID_REGISTRATION.name, confirmPassword: VALID_REGISTRATION.name }, "password"],
    [{ confirmPassword: "Different1!" }, "confirmPassword"],
    [{ acceptTerms: false }, "acceptTerms"],
  ]) {
    const result = schema.safeParse({ ...VALID_REGISTRATION, ...change });
    assert.equal(result.success, false);
    assert.ok(result.error.flatten().fieldErrors[field]?.length, field);
  }
  assert.equal(schema.safeParse(VALID_REGISTRATION).success, true);
});

test("registration service persists only canonical account/profile fields", async () => {
  let persisted;
  const { authService } = load("src/services/auth/auth.service.tsx", {
    "@/utils/auth/password": { hashPassword: async () => "hash", verifyPassword: async () => true },
    "@/repositories/auth.repository": { authRepository: { registerUser: async (input) => { persisted = input; return { id: "u" }; } } },
    "@/repositories/users.repository": { usersRepository: {} },
    "@/repositories/sessions.repository": { sessionRepository: {} },
  });
  await authService.register(VALID_REGISTRATION);
  assert.deepEqual(persisted, {
    email: VALID_REGISTRATION.email,
    name: VALID_REGISTRATION.name,
    passwordHash: "hash",
    realName: VALID_REGISTRATION.real_name,
    phone: VALID_REGISTRATION.phone,
  });
  assert.equal("confirmPassword" in persisted, false);
  assert.equal("acceptTerms" in persisted, false);
});

test("registration API returns flat safe field errors", async () => {
  const { POST } = load("src/app/api/auth/register/route.ts", {
    "@/services/auth/auth.service": { authService: { register: async (input) => registerSchema().parse(input) } },
    "@/libs/security/turnstile": { verifyTurnstile: async () => true },
    "@/libs/security/rate-limit": { checkRateLimit: () => ({ allowed: true }), getRequestIp: () => "fixture" },
    "@/services/email-verification/email-verification.service": { emailVerificationService: { request: async () => {} } },
  });
  const response = await POST(new Request("https://fixture.invalid/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...VALID_REGISTRATION, email: "invalid", confirmPassword: "different", turnstileToken: "ok" }),
  }));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.message, "請檢查輸入內容");
  assert.ok(Array.isArray(body.errors.email));
  assert.ok(Array.isArray(body.errors.confirmPassword));
  assert.equal("properties" in body.errors, false);
});

test("board-game return state is rebuilt from recognized normalized discovery fields", () => {
  const { normalizeBoardGameDiscoveryReturnTo } = load("src/app/(public)/board-games/discovery-return.ts");
  const category = "00000000-0000-4000-8000-000000000001";
  const restored = normalizeBoardGameDiscoveryReturnTo(`/board-games?page=4&pageSize=24&sort=rating%3Adesc&search=%E7%AD%96%E7%95%A5&status=available&category=${category}`);
  assert.match(restored, /^\/board-games\?/);
  assert.match(restored, /page=4/);
  assert.match(restored, /pageSize=24/);
  assert.match(restored, /sort=rating%3Adesc/);
  assert.match(restored, /search=%E7%AD%96%E7%95%A5/);
  assert.match(restored, /status=available/);
  assert.match(restored, new RegExp(`category=${category}`));
  for (const unsafe of [
    "https://evil.invalid/board-games?page=2",
    "//evil.invalid/board-games",
    "/admin/users",
    "/board-games#fragment",
    "/board-games?unknown=value",
    "/board-games\u0000?page=2",
  ]) assert.equal(normalizeBoardGameDiscoveryReturnTo(unsafe), "/board-games");
  assert.equal(normalizeBoardGameDiscoveryReturnTo(undefined), "/board-games");
});

test("board-game card carries the canonical return target without changing its destination origin", () => {
  const { BoardGameCard } = load("src/components/(public)/board-games/BoardGameCard.tsx");
  const boardGame = { id: "game", name: "策略桌遊", image: null, status: "available", inventory_number: 1, category: null, location: null, stats: { averageRating: null, ratingCount: 0 } };
  const html = renderToStaticMarkup(createElement(BoardGameCard, { boardGame, returnTo: "/board-games?page=4&sort=rating%3Adesc" }));
  assert.match(html, /href="\/board-games\/game\?returnTo=%2Fboard-games%3Fpage%3D4%26sort%3Drating%253Adesc"/);
});

test("review navigation preserves return state while metadata remains detail-canonical", async () => {
  const { BoardGameReviews } = load("src/components/(public)/board-games/BoardGameReviews.tsx", { "next/navigation": { useRouter: () => ({ push: () => {}, replace: () => {} }) } });
  const returnTo = "/board-games?page=4&sort=rating%3Adesc";
  const html = renderToStaticMarkup(createElement(BoardGameReviews, {
    boardGameId: "game", returnTo, sort: "oldest",
    aggregate: { averageRating: 4, ratingCount: 2, reviewCount: 1 },
    reviews: { data: [], page: 1, pageSize: 10, total: 2, totalPages: 2 },
  }));
  assert.match(html, /name="returnTo" value="\/board-games\?page=4&amp;sort=rating%3Adesc"/);
  assert.match(html, /returnTo=[^"#]*reviewPage=2/);
  const detailSource = await import("node:fs/promises").then(({ readFile }) => readFile("src/app/(public)/board-games/[id]/page.tsx", "utf8"));
  assert.match(detailSource, /const canonical = `\/board-games\/\$\{boardGame\.id\}`/);
  assert.doesNotMatch(detailSource, /canonical\s*=.*returnTo/);
});

test("returnTo remains one canonical discovery URL across repeated Review navigation", () => {
  const { normalizeBoardGameDiscoveryReturnTo } = load("src/app/(public)/board-games/discovery-return.ts");
  const canonical = normalizeBoardGameDiscoveryReturnTo("/board-games?page=4&pageSize=24&sort=rating%3Adesc&search=%E7%AD%96%E7%95%A5");
  let current = canonical;
  for (let index = 0; index < 4; index += 1) {
    const detailQuery = new URLSearchParams({
      reviewPage: String(index + 1),
      reviewSort: index % 2 ? "highest" : "newest",
      returnTo: current,
    });
    assert.equal(detailQuery.getAll("returnTo").length, 1);
    current = normalizeBoardGameDiscoveryReturnTo(detailQuery.get("returnTo"));
    assert.equal(current, canonical);
    assert.equal(new URL(current, "https://local.invalid").searchParams.has("returnTo"), false);
  }
  assert.equal(current.length, canonical.length);

  const encodedExternal = encodeURIComponent("https://evil.invalid/board-games");
  assert.equal(normalizeBoardGameDiscoveryReturnTo(encodedExternal), "/board-games");
  assert.equal(
    normalizeBoardGameDiscoveryReturnTo(decodeURIComponent(encodedExternal)),
    "/board-games",
  );
});

test("profile review repository uses one bounded relationship query and deterministic newest-first order", async () => {
  const calls = [];
  const query = {
    select(projection, options) { calls.push(["select", projection, options]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    async range(from, to) { calls.push(["range", from, to]); return { data: [], count: 0, error: null }; },
  };
  const { boardGameReviewsRepository } = load("src/repositories/board-game-reviews.repository.ts", {
    "@/libs/supabase/server": { supabase: { from(table) { calls.push(["from", table]); return query; } } },
  });
  await boardGameReviewsRepository.findPublicPageByUser("user", { page: 2, pageSize: 10 });
  assert.deepEqual(calls.filter(([name]) => name === "from"), [["from", "board_game_reviews"]]);
  assert.match(calls.find(([name]) => name === "select")[1], /board_game:board_games[^)]*\(id,name\)/);
  assert.deepEqual(calls.filter(([name]) => name === "order").map((call) => call.slice(1)), [
    ["created_at", { ascending: false }], ["id", { ascending: false }],
  ]);
  assert.deepEqual(calls.find(([name]) => name === "range"), ["range", 10, 19]);
});

test("profile review presentation includes written and rating-only rows without filler", () => {
  const { ProfileReviewItems } = load("src/components/(public)/profile/ProfileReviews.tsx");
  const html = renderToStaticMarkup(createElement(ProfileReviewItems, {
    reviews: {
      page: 1, pageSize: 10, total: 2, totalPages: 1,
      data: [
        { id: "rating", rating: 5, content: null, createdAt: "2026-09-16T00:00:00Z", updatedAt: "2026-09-16T00:00:00Z", boardGame: { id: "g1", name: "只有評分" } },
        { id: "written", rating: 4, content: "值得再玩", createdAt: "2026-09-15T00:00:00Z", updatedAt: "2026-09-15T00:00:02Z", boardGame: { id: "g2", name: "文字評論" } },
      ],
    },
  }));
  assert.equal((html.match(/<article/g) ?? []).length, 2);
  assert.match(html, /href="\/board-games\/g1"/);
  assert.match(html, /aria-label="評分 5 分"/);
  assert.match(html, /值得再玩/);
  assert.match(html, /已編輯/);
  assert.doesNotMatch(html, /沒有留下評論|此使用者只有評分|尚無文字內容/);
});

test("profile review service exposes only review and narrow board-game fields", async () => {
  const extra = { email: "private@example.invalid", real_name: "PRIVATE" };
  const { reviewsService } = load("src/services/reviews/reviews.service.ts", {
    "@/repositories/board-game-reviews.repository": { boardGameReviewsRepository: {
      findPublicPageByUser: async () => ({ page: 1, pageSize: 10, total: 1, totalPages: 1, data: [{ id: "r", board_game_id: "g", user_id: "u", rating: 5, content: null, created_at: "a", updated_at: "a", board_game: { id: "g", name: "遊戲", ...extra }, ...extra }] }),
    } },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
  });
  const result = await reviewsService.listPublicByUser("00000000-0000-4000-8000-000000000001", { page: 1, pageSize: 10 });
  assert.deepEqual(result.data[0], { id: "r", rating: 5, content: null, createdAt: "a", updatedAt: "a", boardGame: { id: "g", name: "遊戲" } });
  assert.doesNotMatch(JSON.stringify(result), /private@example|PRIVATE|user_id/);
});

test("active public profile loads one public review page and closed profile suppresses history", async () => {
  let calls = 0;
  const activePage = load("src/app/(public)/profile/[id]/page.tsx", {
    "next/navigation": { useRouter: () => ({ push: () => {}, replace: () => {} }), redirect: () => {} },
    "./public-profile": { getPublicProfile: async () => ({ identity: { id: "00000000-0000-4000-8000-000000000001", name: "會員", avatar: null }, identityBadges: [], clubFootprint: { totalBorrowedCount: 0, attendedCount: 0, joinedAcademicYear: null } }) },
    "@/services/reviews/reviews.service": { reviewsService: { listPublicByUser: async () => { calls++; return { data: [], page: 1, pageSize: 10, total: 0, totalPages: 0 }; } } },
  });
  const first = renderToStaticMarkup(await activePage.default({ params: Promise.resolve({ id: "u" }), searchParams: Promise.resolve({ reviewPage: "1" }) }));
  const second = renderToStaticMarkup(await activePage.default({ params: Promise.resolve({ id: "u" }), searchParams: Promise.resolve({ reviewPage: "1" }) }));
  assert.match(first, /桌遊評分與評論/);
  assert.equal(first, second);
  assert.equal(calls, 2);

  const closedPage = load("src/app/(public)/profile/[id]/page.tsx", {
    "next/navigation": { useRouter: () => ({ push: () => {}, replace: () => {} }), redirect: () => {} },
    "./public-profile": { getPublicProfile: async () => ({ identity: { id: "u", name: "已註銷使用者", avatar: null }, identityBadges: [], clubFootprint: null }) },
    "@/services/reviews/reviews.service": { reviewsService: { listPublicByUser: async () => { throw new Error("must not query"); } } },
  });
  const closed = renderToStaticMarkup(await closedPage.default({ params: Promise.resolve({ id: "u" }) }));
  assert.doesNotMatch(closed, /桌遊評分與評論/);
});

test("rating recommendation label and admin public-profile actions preserve their contracts", async () => {
  const { SORT_OPTIONS } = load("src/app/(public)/board-games/constants.ts");
  assert.equal(SORT_OPTIONS.find(({ key }) => key === "rating:desc").label, "評價推薦");
  assert.equal(SORT_OPTIONS.find(({ key }) => key === "rating:desc").orderBy, "rating");
  const { readFile } = await import("node:fs/promises");
  const [admin, repository] = await Promise.all([
    readFile("src/app/(admin)/admin/users/[id]/page.tsx", "utf8"),
    readFile("src/repositories/board-game-statistics.repository.ts", "utf8"),
  ]);
  assert.match(admin, /href={`\/profile\/\$\{user\.id\}`}/);
  assert.match(admin, /user\.closed_at \? "查看匿名化公開頁" : "查看公開個人頁"/);
  const start = repository.indexOf('.order("bayesian_rating"');
  assert.ok(start >= 0);
  assert.ok(repository.indexOf('.order("rating_count"', start) > start);
  assert.ok(repository.indexOf('.order("average_rating"', start) > start);
});

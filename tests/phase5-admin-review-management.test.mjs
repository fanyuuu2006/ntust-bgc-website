import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("Admin Review query normalization is bounded and URL authoritative", () => {
  const { adminReviewsQuerySchema } = load(
    "src/services/reviews/reviews.schema.ts",
  );

  assert.deepEqual(
    adminReviewsQuerySchema.parse({
      page: "2",
      pageSize: "20",
      search: "  strategy  ",
      rating: "5",
      boardGameId: "11111111-1111-4111-8111-111111111111",
      sort: "lowest",
    }),
    {
      page: 2,
      pageSize: 20,
      search: "strategy",
      rating: 5,
      boardGameId: "11111111-1111-4111-8111-111111111111",
      sort: "lowest",
    },
  );
  assert.deepEqual(adminReviewsQuerySchema.parse({ page: "bad", rating: "9" }), {
    page: 1,
    pageSize: 20,
    rating: undefined,
    sort: "newest",
  });
});

test("Admin Review search expands identity and Board Game matches before one main query", async () => {
  const calls = [];
  const result = { data: [], page: 2, pageSize: 20, total: 0, totalPages: 0 };
  const { adminReviewsService } = load("src/services/reviews/admin-reviews.service.ts", {
    "@/repositories/board-game-reviews.repository": {
      boardGameReviewsRepository: {
        findAdminPage: async (options) => {
          calls.push(["reviews", options]);
          return result;
        },
      },
    },
    "@/repositories/users.repository": {
      usersRepository: {
        findIdsBySearch: async (search) => {
          calls.push(["users", search]);
          return ["11111111-1111-4111-8111-111111111111"];
        },
        findManyByIds: async () => [],
      },
    },
    "@/repositories/user-profiles.repository": {
      userProfilesRepository: {
        findUserIdsBySearch: async (search) => {
          calls.push(["profiles", search]);
          return ["22222222-2222-4222-8222-222222222222"];
        },
        findManyByUserIds: async () => [],
      },
    },
    "@/repositories/board-games.repository": {
      boardGamesRepository: {
        findIdsBySearch: async (search) => {
          calls.push(["games", search]);
          return ["33333333-3333-4333-8333-333333333333"];
        },
        findManyByIds: async () => [],
      },
    },
  });

  await adminReviewsService.list({
    page: 2,
    pageSize: 20,
    search: " strategy ",
    rating: 5,
    sort: "lowest",
  });

  assert.deepEqual(calls.slice(0, 3), [
    ["users", "strategy"],
    ["profiles", "strategy"],
    ["games", "strategy"],
  ]);
  assert.deepEqual(calls[3], ["reviews", {
    page: 2,
    pageSize: 20,
    search: "strategy",
    rating: 5,
    sort: "lowest",
    matchedUserIds: [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ],
    matchedBoardGameIds: ["33333333-3333-4333-8333-333333333333"],
  }]);
});

test("Admin Review repository keeps count, search, filters, sort and pagination in one query", async () => {
  const calls = [];
  const builder = {
    select(columns, options) { calls.push(["select", columns, options]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    or(expression) { calls.push(["or", expression]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    range(from, to) { calls.push(["range", from, to]); return Promise.resolve({ data: [], error: null, count: 0 }); },
  };
  const { boardGameReviewsRepository } = load(
    "src/repositories/board-game-reviews.repository.ts",
    { "@/libs/supabase/server": { supabase: { from: () => builder } } },
  );

  await boardGameReviewsRepository.findAdminPage({
    page: 2,
    pageSize: 10,
    search: "long text",
    rating: 4,
    boardGameId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    matchedUserIds: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
    matchedBoardGameIds: ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
    sort: "highest",
  });

  assert.deepEqual(calls[0][2], { count: "exact" });
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "rating" && call[2] === 4));
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "board_game_id"));
  assert.match(calls.find((call) => call[0] === "or")[1], /content\.ilike/);
  assert.match(calls.find((call) => call[0] === "or")[1], /user_id\.in/);
  assert.match(calls.find((call) => call[0] === "or")[1], /board_game_id\.in/);
  assert.deepEqual(calls.at(-1), ["range", 10, 19]);
});

test("Admin Review delete reuses aggregate-safe deletion and cache invalidation", async () => {
  const calls = [];
  const { reviewsService } = load("src/services/reviews/reviews.service.ts", {
    "@/repositories/board-game-reviews.repository": {
      boardGameReviewsRepository: {
        deleteById: async (id) => { calls.push(["delete", id]); return true; },
      },
    },
    "@/libs/cache/public-data": {
      invalidatePublicDataSafely: (...keys) => calls.push(["invalidate", ...keys]),
    },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
    "@/repositories/users.repository": { usersRepository: {} },
    "@/repositories/user-profiles.repository": { userProfilesRepository: {} },
  });

  await reviewsService.deleteForAdmin("11111111-1111-4111-8111-111111111111");
  assert.deepEqual(calls, [
    ["delete", "11111111-1111-4111-8111-111111111111"],
    ["invalidate", "popularGames"],
  ]);
});

test("Admin Review route, responsive records and navigation preserve moderation boundaries", async () => {
  const [page, records, filters, picker, sortable, route, navigation] = await Promise.all([
    readSource("src/app/(admin)/admin/reviews/page.tsx"),
    readSource("src/components/(admin)/admin/reviews/AdminReviewRecords.tsx"),
    readSource("src/components/(admin)/admin/reviews/AdminReviewFilters.tsx"),
    readSource("src/components/(admin)/admin/reviews/AdminBoardGameFilter.tsx"),
    readSource("src/components/(admin)/admin/SortableTableHeader.tsx"),
    readSource("src/app/api/admin/reviews/[id]/route.ts"),
    readSource("src/libs/navigation.tsx"),
  ]);

  assert.match(page, /評價與評論管理/);
  assert.match(page, /PaginationSummary/);
  assert.match(page, /Pagination/);
  assert.match(page, /adminReviewsQuerySchema/);
  assert.match(records, /AdminUserIdentity/);
  assert.match(records, /未填寫文字評價/);
  assert.match(records, /line-clamp/);
  assert.match(records, /lg:hidden/);
  assert.match(records, /hidden[^\n]*lg:block/);
  assert.match(records, /ConfirmDialog/);
  assert.match(records, /SortableTableHeader/);
  assert.match(records, /sortValues=\{\{ asc: "lowest", desc: "highest" \}\}/);
  assert.match(records, /sortValues=\{\{ asc: "oldest", desc: "newest" \}\}/);
  assert.match(records, /line-clamp-2/);
  assert.match(records, /variant="ghost"/);
  assert.match(records, /max-h-\[65dvh\]/);
  assert.doesNotMatch(records, /disambiguation=.*email/);
  assert.match(filters, /QueryFilterForm/);
  assert.match(filters, /lg:hidden/);
  assert.match(picker, /搜尋桌遊名稱或社產編號/);
  assert.doesNotMatch(filters, /館藏/);
  assert.match(picker, /onBlur/);
  assert.match(picker, /event\.key === "Escape"/);
  assert.match(picker, /type="hidden" name=\{name\}/);
  assert.match(sortable, /sortValues/);
  assert.match(route, /authorizeAdminRequest/);
  assert.match(route, /deleteForAdmin/);
  assert.match(navigation, /評價與評論管理/);
});

test("Board Game Review picker closes stale results on selection, clear, Escape and new input", () => {
  const {
    adminBoardGamePickerReducer,
    createAdminBoardGamePickerState,
  } = load("src/components/(admin)/admin/reviews/adminBoardGamePickerState.ts");
  const game = { id: "11111111-1111-4111-8111-111111111111", name: "測試桌遊", inventoryNumber: 900001 };

  let state = createAdminBoardGamePickerState(null);
  assert.equal(state.open, false);
  state = adminBoardGamePickerReducer(state, { type: "search_changed", value: "策略" });
  state = adminBoardGamePickerReducer(state, { type: "search_started" });
  state = adminBoardGamePickerReducer(state, { type: "search_succeeded", candidates: [game] });
  assert.equal(state.open, true);
  assert.deepEqual(state.candidates, [game]);

  state = adminBoardGamePickerReducer(state, { type: "selected", value: game });
  assert.equal(state.open, false);
  assert.equal(state.searchText, "");
  assert.equal(state.selected.id, game.id);

  state = adminBoardGamePickerReducer(state, { type: "cleared" });
  assert.deepEqual(state, createAdminBoardGamePickerState(null));

  state = adminBoardGamePickerReducer(state, { type: "search_changed", value: "社產" });
  state = adminBoardGamePickerReducer(state, { type: "search_succeeded", candidates: [game] });
  state = adminBoardGamePickerReducer(state, { type: "dismissed" });
  assert.equal(state.open, false);
  assert.deepEqual(state.candidates, []);
});

test("Admin Review delete API enforces authorization and maps success, invalid and missing records", async () => {
  class MockReviewNotFoundError extends Error {}
  const loadRoute = ({ authorization, deleteForAdmin }) => load(
    "src/app/api/admin/reviews/[id]/route.ts",
    {
      "@/libs/api/admin-authorization": {
        authorizeAdminRequest: async () => authorization,
      },
      "@/services/reviews/reviews.service": {
        reviewsService: { deleteForAdmin },
      },
      "@/services/reviews/reviews.errors": {
        ReviewNotFoundError: MockReviewNotFoundError,
      },
    },
  );
  const params = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) };

  for (const status of [401, 403]) {
    const denied = new Response(JSON.stringify({ message: "denied" }), { status });
    const deniedRoute = loadRoute({
      authorization: { user: null, response: denied },
      deleteForAdmin: async () => assert.fail("must not delete"),
    });
    assert.equal((await deniedRoute.DELETE(new Request("https://example.test"), params)).status, status);
  }

  let deletedId;
  const acceptedRoute = loadRoute({
    authorization: { user: { id: "admin" }, response: null },
    deleteForAdmin: async (id) => { deletedId = id; },
  });
  assert.equal((await acceptedRoute.DELETE(new Request("https://example.test"), params)).status, 200);
  assert.equal(deletedId, "11111111-1111-4111-8111-111111111111");

  const { z } = await import("zod");
  const invalidRoute = loadRoute({
    authorization: { user: { id: "admin" }, response: null },
    deleteForAdmin: async () => { z.uuid().parse("invalid"); },
  });
  assert.equal((await invalidRoute.DELETE(new Request("https://example.test"), params)).status, 400);

  const missingRoute = loadRoute({
    authorization: { user: { id: "admin" }, response: null },
    deleteForAdmin: async () => { throw new MockReviewNotFoundError(); },
  });
  assert.equal((await missingRoute.DELETE(new Request("https://example.test"), params)).status, 404);
});

test("public identity and aggregate views remain private-safe and immediately derived", async () => {
  const [publicIdentity, migration] = await Promise.all([
    readSource("src/services/users/public-identity.ts"),
    readSource("supabase/migrations/202609150001_add_board_game_reviews.sql"),
  ]);
  assert.doesNotMatch(publicIdentity, /real_name|student_id|email/);
  assert.match(migration, /create view public\.board_game_review_statistics/);
  assert.match(migration, /count\(\*\).*rating_count/s);
  assert.match(migration, /count\(\*\) filter \(where review\.content is not null\).*review_count/s);
});

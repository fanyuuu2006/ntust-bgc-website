import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public repository paginates written reviews before sorting and counting", async () => {
  const calls = [];
  const rows = Array.from({ length: 8 }, (_, index) => ({ id: `r${index}`, content: `review ${index}` }));
  const builder = {
    select(projection, options) { calls.push(["select", projection, options]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    not(column, operator, value) { calls.push(["not", column, operator, value]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    range(from, to) { calls.push(["range", from, to]); return Promise.resolve({ data: rows.slice(from, to + 1), count: 8, error: null }); },
  };
  const { boardGameReviewsRepository } = load("src/repositories/board-game-reviews.repository.ts", {
    "@/libs/supabase/server": { supabase: { from: (table) => { assert.equal(table, "board_game_reviews"); return builder; } } },
  });
  const result = await boardGameReviewsRepository.findPublicPage("game", { page: 2, pageSize: 5, sort: "highest" });
  assert.deepEqual(calls.find((call) => call[0] === "not"), ["not", "content", "is", null]);
  assert.deepEqual(calls.filter((call) => call[0] === "order").map((call) => call.slice(1)), [
    ["rating", { ascending: false }], ["created_at", { ascending: false }], ["id", { ascending: false }],
  ]);
  assert.deepEqual(calls.find((call) => call[0] === "range"), ["range", 5, 9]);
  assert.equal(result.total, 8);
  assert.equal(result.totalPages, 2);

  for (const [sort, expected] of [
    ["newest", [["created_at", { ascending: false }], ["id", { ascending: false }]]],
    ["oldest", [["created_at", { ascending: true }], ["id", { ascending: true }]]],
    ["lowest", [["rating", { ascending: true }], ["created_at", { ascending: false }], ["id", { ascending: false }]]],
  ]) {
    calls.length = 0;
    await boardGameReviewsRepository.findPublicPage("game", { page: 1, pageSize: 5, sort });
    assert.deepEqual(calls.filter((call) => call[0] === "order").map((call) => call.slice(1)), expected);
    assert.deepEqual(calls.find((call) => call[0] === "not"), ["not", "content", "is", null]);
  }
});

test("rating count and written review count remain separate", async () => {
  const source = await read("src/repositories/board-game-reviews.repository.ts");
  const migration = await read("supabase/migrations/202609150001_add_board_game_reviews.sql");
  assert.match(source, /\.not\("content", "is", null\)/);
  assert.match(migration, /count\(\*\)::bigint as rating_count/);
  assert.match(migration, /count\(\*\) filter \(where review\.content is not null\)::bigint as review_count/);
});

test("review presentation renders canonical author, safe plain text, edited state and pagination", () => {
  const { BoardGameReviews } = load("src/components/(public)/board-games/BoardGameReviews.tsx");
  const html = renderToStaticMarkup(createElement(BoardGameReviews, {
    boardGameId: "game-id",
    aggregate: { averageRating: 4, ratingCount: 3, reviewCount: 2 },
    sort: "newest",
    reviews: {
      data: [{ id: "review", rating: 5, content: "first\n<script>alert(1)</script> longword", createdAt: "2026-09-14T00:00:00Z", updatedAt: "2026-09-14T00:00:02Z", author: { id: "author", name: "作者", avatar: null } }],
      page: 1, pageSize: 10, total: 11, totalPages: 2,
    },
  }));
  assert.match(html, /href="\/profile\/author"/);
  assert.match(html, /first\n&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /已編輯/);
  assert.match(html, /aria-label="評論分頁"/);
  assert.match(html, /reviewPage=2/);
  assert.doesNotMatch(html, /dangerouslySetInnerHTML/);

  const newlyCreatedHtml = renderToStaticMarkup(createElement(BoardGameReviews, {
    boardGameId: "game-id",
    aggregate: { averageRating: 5, ratingCount: 1, reviewCount: 1 },
    sort: "newest",
    reviews: {
      data: [{ id: "new-review", rating: 5, content: "new", createdAt: "2026-09-14T00:00:00.000Z", updatedAt: "2026-09-14T00:00:00.500Z", author: { id: "author", name: "作者", avatar: null } }],
      page: 1, pageSize: 10, total: 1, totalPages: 1,
    },
  }));
  assert.doesNotMatch(newlyCreatedHtml, /已編輯/);
});

test("review presentation distinguishes no ratings from rating-only activity", () => {
  const { BoardGameReviews } = load("src/components/(public)/board-games/BoardGameReviews.tsx");
  const base = { boardGameId: "game", sort: "newest", reviews: { data: [], page: 1, pageSize: 10, total: 0, totalPages: 0 } };
  const empty = renderToStaticMarkup(createElement(BoardGameReviews, { ...base, aggregate: { averageRating: null, ratingCount: 0, reviewCount: 0 } }));
  assert.match(empty, /尚無評分/);
  assert.match(empty, /目前還沒有文字評論/);
  assert.doesNotMatch(empty, /0\.0 \/ 5/);
  const ratingOnly = renderToStaticMarkup(createElement(BoardGameReviews, { ...base, aggregate: { averageRating: 4.5, ratingCount: 6, reviewCount: 0 } }));
  assert.match(ratingOnly, />4\.5</);
  assert.match(ratingOnly, /aria-label="平均評分 4\.5，滿分 5 分"/);
  assert.match(ratingOnly, /style="width:50%"/);
  assert.doesNotMatch(ratingOnly, /4\.5 \/ 5/);
  assert.match(ratingOnly, /6 人評分/);
  assert.match(ratingOnly, /目前還沒有文字評論/);
});

test("public detail keeps canonical metadata and noindexes review variants", async () => {
  const page = await read("src/app/(public)/board-games/[id]/page.tsx");
  assert.match(page, /reviewsService\.getAggregate\(boardGame\.id\)/);
  assert.match(page, /reviewsService\.listPublic\(boardGame\.id, reviewQuery\)/);
  assert.match(page, /Promise\.all/);
  assert.match(page, /alternates: \{ canonical \}/);
  assert.match(page, /reviewQuery\.page > 1 \|\| reviewQuery\.sort !== "newest"/);
  assert.doesNotMatch(page, /hasReviewQueryVariant/);
  assert.match(page, /robots: \{ index: false, follow: true \}/);
  assert.match(page, /user\.email_verified_at \? reviewsService\.findOwn\(user\.id, boardGame\.id\)/);
});

test("review metadata follows normalized query semantics", async () => {
  const game = { id: "00000000-0000-4000-8000-000000000001", name: "Fixture", description: "Description", image: null };
  const pageModule = load("src/app/(public)/board-games/[id]/page.tsx", {
    "@/components/RichTextRenderer": { RichTextRenderer: () => null },
    "@/libs/rich-content/description": { storedDescription: () => ({}) },
    "@/libs/observability/server-render": { withServerErrorReference: (fn) => fn },
    "@/components/(public)/board-games/BoardGameBorrowingPanel": { BoardGameBorrowingPanel: () => null },
    "@/components/(public)/board-games/BoardGameStatusBadge": { BoardGameStatusBadge: () => null },
    "@/components/BoardGameImage": { BoardGameImage: () => null },
    "@/components/(public)/board-games/BoardGameReviews": { BoardGameReviews: () => null },
    "@/components/ui/Button": { ButtonLink: () => null },
    "@/libs/metadata-content": { createMetadataDescription: (value) => value, createMetadataTitle: (value) => value, getSafeMetadataImageUrl: () => null },
    "@/libs/public-viewer": { resolvePublicViewer: async () => ({ status: "resolved", user: null }) },
    "@/services/board-games/board-games.service": { boardGamesService: {} },
    "@/services/memberships/memberships.service": { membershipService: {} },
    "@/services/reviews/reviews.service": { reviewsService: {} },
    "./board-game-detail": { getBoardGameDetail: async () => game },
  });
  const metadata = async (query) => pageModule.generateMetadata({ params: Promise.resolve({ id: game.id }), searchParams: Promise.resolve(query) });
  for (const query of [{}, { reviewPage: "abc" }, { reviewSort: "garbage" }, { reviewPage: "1", reviewSort: "newest" }]) {
    const result = await metadata(query);
    assert.equal(result.alternates.canonical, `/board-games/${game.id}`);
    assert.equal(result.robots, undefined);
  }
  for (const query of [{ reviewPage: "2" }, { reviewSort: "oldest" }, { reviewSort: "highest" }]) {
    assert.deepEqual((await metadata(query)).robots, { index: false, follow: true });
  }
});

test("board-game review FK deletion maps narrowly to a safe 409", async () => {
  const [service, route, errors] = await Promise.all([
    read("src/services/board-games/board-games.service.ts"),
    read("src/app/api/admin/board-games/[id]/route.ts"),
    read("src/services/board-games/board-games.errors.tsx"),
  ]);
  assert.match(service, /23503[\s\S]*board_game_reviews_board_game_id_fkey[\s\S]*BoardGameHasReviewsError/);
  assert.match(service, /deleteById\(id\)\.catch\(rethrowBoardGameDeleteConflict\)/);
  assert.match(route, /BoardGameHasReviewsError[\s\S]*status: 409/);
  assert.match(errors, /此桌遊已有評分或評論紀錄，無法直接刪除。/);
  assert.doesNotMatch(service, /delete.*board_game_reviews|cascade/i);
});

test("launch legal copy is narrow and does not claim moderation features", async () => {
  const [privacy, terms] = await Promise.all([
    read("src/app/(public)/privacy/page.tsx"),
    read("src/app/(public)/terms/page.tsx"),
  ]);
  assert.match(privacy, /桌遊評分與評論[\s\S]*已註銷使用者[\s\S]*借用明細、簽到明細、聯絡資料與學籍資料不會因評論而公開/);
  assert.match(terms, /不得冒用[\s\S]*違法、侵權、惡意攻擊[\s\S]*使用者應對自己提交的評分與評論負責/);
  assert.match(terms, /不代表本站已提供自動審查、檢舉、申訴或 moderation queue/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public repository delegates stable sorting and pagination to one set-based RPC", async () => {
  const calls = [];
  const { boardGameReviewsRepository } = load("src/repositories/board-game-reviews.repository.ts", {
    "@/libs/supabase/server": { supabase: { rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: { data: [{ id: "r1", rating: 5, content: "review", created_at: "created", updated_at: "updated", author_id: "u1", author_name: "User", author_avatar: null, author_closed_at: null, like_count: "4", liked_by_me: true }], total: "15" }, error: null };
    } } },
  });
  const result = await boardGameReviewsRepository.findPublicPage("game", { page: 2, pageSize: 5, sort: "popular", viewerUserId: "viewer" });
  assert.equal(calls[0][0], "list_public_board_game_reviews");
  assert.deepEqual(calls[0][1], { p_board_game_id: "game", p_viewer_user_id: "viewer", p_search: null, p_rating: null, p_sort: "popular", p_offset: 5, p_limit: 5 });
  assert.equal(result.total, 15);
  assert.equal(result.totalPages, 3);
  assert.equal(result.data[0].like_count, "4");
  assert.equal(result.data[0].liked_by_me, true);
});

test("rating count and written review count remain separate", async () => {
  const source = await read("src/repositories/board-game-reviews.repository.ts");
  const migration = await read("supabase/migrations/202609150001_add_board_game_reviews.sql");
  assert.doesNotMatch(source, /\.not\("content", "is", null\)/);
  assert.match(migration, /count\(\*\)::bigint as rating_count/);
  assert.match(migration, /count\(\*\) filter \(where review\.content is not null\)::bigint as review_count/);
});

test("review presentation renders canonical author, safe plain text, edited state and pagination", () => {
  const { BoardGameReviews } = load("src/components/(public)/board-games/BoardGameReviews.tsx", { "next/navigation": { useRouter: () => ({ push: () => {}, replace: () => {} }) } });
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

test("mixed public list renders rating-only entries without an empty content block", () => {
  const { BoardGameReviews } = load("src/components/(public)/board-games/BoardGameReviews.tsx", { "next/navigation": { useRouter: () => ({ push: () => {}, replace: () => {} }) } });
  const html = renderToStaticMarkup(createElement(BoardGameReviews, {
    boardGameId: "game-id",
    aggregate: { averageRating: 4.5, ratingCount: 2, reviewCount: 1 },
    sort: "newest",
    reviews: {
      data: [
        { id: "rating-only", rating: 5, content: null, createdAt: "2026-09-15T00:00:00Z", updatedAt: "2026-09-15T00:00:00Z", author: { id: "closed-author", name: "已註銷使用者", avatar: null } },
        { id: "written", rating: 4, content: "值得再玩一次", createdAt: "2026-09-14T00:00:00Z", updatedAt: "2026-09-14T00:00:00Z", author: { id: "author", name: "作者", avatar: null } },
      ],
      page: 1, pageSize: 10, total: 2, totalPages: 1,
    },
  }));
  assert.match(html, /已註銷使用者/);
  assert.match(html, /aria-label="評分 5 分"/);
  assert.match(html, /值得再玩一次/);
  assert.equal((html.match(/<article/g) ?? []).length, 2);
  assert.equal((html.match(/<p class="mt-3/g) ?? []).length, 1);
  assert.match(html, /<h3 id="public-reviews-title"[^>]*>公開評價<\/h3>/);
  assert.match(html, /class="divide-y divide-\(--border-muted\)"/);
  assert.doesNotMatch(html, /divide-y[^\"]*border-y/);
  assert.doesNotMatch(html, /沒有留下評論|此使用者只有評分|尚無文字內容/);
});

test("review presentation distinguishes no ratings from rating-only activity", () => {
  const { BoardGameReviews } = load("src/components/(public)/board-games/BoardGameReviews.tsx", { "next/navigation": { useRouter: () => ({ push: () => {}, replace: () => {} }) } });
  const base = { boardGameId: "game", sort: "newest", reviews: { data: [], page: 1, pageSize: 10, total: 0, totalPages: 0 } };
  const empty = renderToStaticMarkup(createElement(BoardGameReviews, { ...base, aggregate: { averageRating: null, ratingCount: 0, reviewCount: 0 } }));
  assert.match(empty, /尚無評分/);
  assert.match(empty, /目前還沒有評分/);
  assert.doesNotMatch(empty, /0\.0 \/ 5/);
  const ratingOnly = renderToStaticMarkup(createElement(BoardGameReviews, {
    ...base,
    aggregate: { averageRating: 4.5, ratingCount: 1, reviewCount: 0 },
    reviews: {
      data: [{ id: "rating-only", rating: 5, content: null, createdAt: "2026-09-14T00:00:00Z", updatedAt: "2026-09-14T00:00:00Z", author: { id: "author", name: "作者", avatar: null } }],
      page: 1, pageSize: 10, total: 1, totalPages: 1,
    },
  }));
  assert.match(ratingOnly, />4\.5</);
  assert.match(ratingOnly, /aria-label="平均評分 4\.5，滿分 5 分"/);
  assert.match(ratingOnly, /style="width:50%"/);
  assert.doesNotMatch(ratingOnly, /4\.5 \/ 5/);
  assert.match(ratingOnly, /1 人評分/);
  assert.match(ratingOnly, /aria-label="評分 5 分"/);
  assert.doesNotMatch(ratingOnly, /目前還沒有評分/);
});

test("public detail keeps canonical metadata and noindexes review variants", async () => {
  const page = await read("src/app/(public)/board-games/[id]/page.tsx");
  assert.match(page, /reviewsService\.getAggregate\(boardGame\.id\)/);
  assert.match(page, /reviewsService\.listPublic\(boardGame\.id, effectiveReviewQuery, viewer\.user\?\.id\)/);
  assert.match(page, /reviewsService\.resolvePublicNewestLocation\(boardGame\.id, reviewQuery\.targetReviewId, reviewQuery\.pageSize\)/);
  assert.match(page, /Promise\.all/);
  assert.match(page, /createPublicMetadata\(\{[\s\S]*?canonical/);
  assert.match(page, /reviewQuery\.page > 1 \|\| reviewQuery\.sort !== "popular"/);
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
  for (const query of [{}, { reviewPage: "abc" }, { reviewSort: "garbage" }, { reviewPage: "1", reviewSort: "popular" }]) {
    const result = await metadata(query);
    assert.equal(result.alternates.canonical, `/board-games/${game.id}`);
    assert.equal(result.robots, undefined);
  }
  for (const query of [{ reviewPage: "2" }, { reviewSort: "newest" }, { reviewSort: "oldest" }, { reviewSort: "highest" }]) {
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

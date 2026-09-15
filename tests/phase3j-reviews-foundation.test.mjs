import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadCommonJs(path, overrides = {}) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", "require", javascript)(runtimeModule.exports, runtimeModule, (specifier) => {
    if (specifier in overrides) return overrides[specifier];
    throw new Error(`Unexpected dependency: ${specifier}`);
  });
  return runtimeModule.exports;
}

test("review migration defines UUID FKs, constraints, security and aggregate semantics", async () => {
  const sql = await readSource("supabase/migrations/202609150001_add_board_game_reviews.sql");
  assert.match(sql, /create table public\.board_game_reviews/);
  assert.match(sql, /id uuid[\s\S]*primary key[\s\S]*gen_random_uuid/);
  assert.match(sql, /board_game_id uuid[\s\S]*references public\.board_games\s*\(id\)[\s\S]*on delete no action/);
  assert.match(sql, /user_id uuid[\s\S]*references public\.users\s*\(id\)[\s\S]*on delete no action/);
  assert.match(sql, /unique \(board_game_id, user_id\)/);
  assert.match(sql, /rating between 1 and 5/);
  assert.match(sql, /char_length\(content\) <= 2000/);
  assert.match(sql, /board_game_id, created_at desc, id desc/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all privileges[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant select, insert, update, delete[\s\S]*to service_role/);
  assert.match(sql, /create view public\.board_game_review_statistics/);
  assert.match(sql, /avg\(review\.rating\)/);
  assert.match(sql, /count\(\*\) filter \(where review\.content is not null\)/);
  assert.doesNotMatch(sql, /board_games_with_statistics/);
});

test("review input normalizes plain text and enforces rating and content bounds", async () => {
  const { createReviewSchema, updateReviewSchema } = await loadCommonJs("src/services/reviews/reviews.schema.ts", { zod: await import("zod") });
  assert.deepEqual(createReviewSchema.parse({ rating: 5, content: "  first\r\nsecond  " }), { rating: 5, content: "first\nsecond" });
  assert.deepEqual(createReviewSchema.parse({ rating: 1, content: " \r\n " }), { rating: 1, content: null });
  assert.equal(createReviewSchema.parse({ rating: 3, content: "😀" }).content, "😀");
  assert.equal(createReviewSchema.parse({ rating: 3, content: "x".repeat(2000) }).content.length, 2000);
  assert.equal(Array.from(createReviewSchema.parse({ rating: 3, content: "😀".repeat(2000) }).content).length, 2000);
  assert.throws(() => createReviewSchema.parse({ rating: 0 }));
  assert.throws(() => createReviewSchema.parse({ rating: 6 }));
  assert.throws(() => createReviewSchema.parse({ rating: 3.5 }));
  assert.throws(() => createReviewSchema.parse({ rating: 3, content: "x".repeat(2001) }));
  assert.throws(() => createReviewSchema.parse({ rating: 3, content: "😀".repeat(2001) }));
  assert.deepEqual(updateReviewSchema.parse({ content: " <b>plain</b> " }), { content: "<b>plain</b>" });
  assert.throws(() => updateReviewSchema.parse({}));
  assert.throws(() => createReviewSchema.parse({ rating: 5, user_id: "forged" }));
});

test("public review DTO uses one narrow author projection and canonical tombstone mapper", async () => {
  const [repository, service, types] = await Promise.all([
    readSource("src/repositories/board-game-reviews.repository.ts"),
    readSource("src/services/reviews/reviews.service.ts"),
    readSource("src/services/reviews/reviews.types.ts"),
  ]);
  assert.match(repository, /author:users!board_game_reviews_user_id_fkey\(id,name,avatar,closed_at\)/);
  assert.doesNotMatch(repository, /select\(["'`]\*["'`]\)/);
  assert.doesNotMatch(repository, /user_profiles|memberships|officer_positions|sessions|auth_credentials/);
  assert.match(service, /toPublicUserIdentity/);
  assert.doesNotMatch(types, /email|phone|student_id|real_name|closed_at|password|token_hash/);
});

test("duplicate and FK races map narrowly while ownership stays in the write predicate", async () => {
  const [repository, service] = await Promise.all([
    readSource("src/repositories/board-game-reviews.repository.ts"),
    readSource("src/services/reviews/reviews.service.ts"),
  ]);
  assert.match(repository, /\.eq\("board_game_id", boardGameId\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(service, /23505[\s\S]*DuplicateReviewError/);
  assert.match(service, /23503[\s\S]*BoardNotFoundError/);
  assert.doesNotMatch(service, /membership|borrowing/i);
});

test("canonical identity mapper hides closed author lifecycle data", async () => {
  const { toPublicUserIdentity } = await loadCommonJs("src/services/users/public-identity.ts", {
    "@/types/public-user": {},
  });
  assert.deepEqual(toPublicUserIdentity({ id: "u1", name: "Active", avatar: "https://example.test/a.png", closed_at: null }), {
    id: "u1", name: "Active", avatar: "https://example.test/a.png",
  });
  assert.deepEqual(toPublicUserIdentity({ id: "u2", name: "Private", avatar: "https://example.test/private.png", closed_at: "2026-09-15T00:00:00Z" }), {
    id: "u2", name: "已註銷使用者", avatar: null,
  });
});

test("concurrent create delegates correctness to UNIQUE and maps only the loser to duplicate", async () => {
  class RepositoryError extends Error { constructor(cause) { super("repository"); this.cause = cause; } }
  class BoardNotFoundError extends Error {}
  class DuplicateReviewError extends Error {}
  class ReviewNotFoundError extends Error {}
  const schema = await loadCommonJs("src/services/reviews/reviews.schema.ts", { zod: await import("zod") });
  let creates = 0;
  const repository = {
    create: async (_game, _user, input) => {
      creates += 1;
      if (creates === 2) throw new RepositoryError({ code: "23505", constraint: "board_game_reviews_user_game_key" });
      return { id: "r1", ...input };
    },
  };
  const { reviewsService } = await loadCommonJs("src/services/reviews/reviews.service.ts", {
    "server-only": {}, zod: await import("zod"),
    "@/repositories/shared/errors": { RepositoryError },
    "@/repositories/board-game-reviews.repository": { boardGameReviewsRepository: repository },
    "@/repositories/board-games.repository": { boardGamesRepository: { findById: async () => ({ id: "g" }) } },
    "@/services/board-games/board-games.errors": { BoardNotFoundError },
    "@/services/users/public-identity": { toPublicUserIdentity: (value) => value },
    "./reviews.schema": schema,
    "./reviews.errors": { DuplicateReviewError, ReviewNotFoundError },
    "./reviews.types": {},
  });
  const input = { rating: 5, content: null };
  const results = await Promise.allSettled([
    reviewsService.create("00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", input),
    reviewsService.create("00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", input),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason instanceof DuplicateReviewError).length, 1);
  assert.equal(creates, 2);
});

test("service maps aggregate defaults, public tombstones and ownership-safe missing writes", async () => {
  class RepositoryError extends Error {}
  class BoardNotFoundError extends Error {}
  class DuplicateReviewError extends Error {}
  class ReviewNotFoundError extends Error {}
  const schema = await loadCommonJs("src/services/reviews/reviews.schema.ts", { zod: await import("zod") });
  const repository = {
    findAggregate: async (id) => id.endsWith("1") ? null : { average_rating: "4.5", rating_count: "2", review_count: "1" },
    findPublicPage: async () => ({
      data: [{ id: "r1", board_game_id: "g", user_id: "u", rating: 4, content: "plain", created_at: "created", updated_at: "updated", author: { id: "u", name: "Private", avatar: "private", closed_at: "closed" } }],
      page: 1, pageSize: 10, total: 1, totalPages: 1,
    }),
    updateOwn: async () => null,
    deleteOwn: async () => false,
  };
  const { reviewsService } = await loadCommonJs("src/services/reviews/reviews.service.ts", {
    "server-only": {}, zod: await import("zod"),
    "@/repositories/shared/errors": { RepositoryError },
    "@/repositories/board-game-reviews.repository": { boardGameReviewsRepository: repository },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
    "@/services/board-games/board-games.errors": { BoardNotFoundError },
    "@/services/users/public-identity": { toPublicUserIdentity: (source) => ({ id: source.id, name: source.closed_at ? "已註銷使用者" : source.name, avatar: source.closed_at ? null : source.avatar }) },
    "./reviews.schema": schema,
    "./reviews.errors": { DuplicateReviewError, ReviewNotFoundError },
    "./reviews.types": {},
  });
  const empty = await reviewsService.getAggregate("00000000-0000-4000-8000-000000000001");
  assert.deepEqual(empty, { averageRating: null, ratingCount: 0, reviewCount: 0 });
  const aggregate = await reviewsService.getAggregate("00000000-0000-4000-8000-000000000002");
  assert.deepEqual(aggregate, { averageRating: 4.5, ratingCount: 2, reviewCount: 1 });
  const page = await reviewsService.listPublic("00000000-0000-4000-8000-000000000002", {});
  assert.deepEqual(page.data[0].author, { id: "u", name: "已註銷使用者", avatar: null });
  assert.deepEqual(Object.keys(page.data[0]).sort(), ["author", "content", "createdAt", "id", "rating", "updatedAt"]);
  await assert.rejects(() => reviewsService.updateOwn("u", "00000000-0000-4000-8000-000000000002", { rating: 2 }), ReviewNotFoundError);
  await assert.rejects(() => reviewsService.deleteOwn("u", "00000000-0000-4000-8000-000000000002"), ReviewNotFoundError);
});

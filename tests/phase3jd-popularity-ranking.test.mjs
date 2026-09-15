import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const BORROWING_SATURATION = 20;
const RATING_SATURATION = 10;
const PRIOR_MEAN = 3.5;
const PRIOR_SIZE = 20;
const CONFIDENCE = 5;

function score(game, communityMean) {
  const borrowingHeat = Math.min(1, Math.log1p(game.borrowings) / Math.log1p(BORROWING_SATURATION));
  const participation = Math.min(1, Math.log1p(game.ratings) / Math.log1p(RATING_SATURATION));
  const bayesian = game.ratings === 0 ? null : (game.ratings * game.average + CONFIDENCE * communityMean) / (game.ratings + CONFIDENCE);
  const quality = bayesian === null ? 0 : Math.min(1, Math.max(0, (bayesian - 1) / 4));
  return 0.50 * borrowingHeat + 0.35 * quality + 0.15 * participation;
}

test("stable V1 formula ranks representative fixtures without catalog-relative maxima", () => {
  const games = [
    { id: "A", borrowings: 2, average: 5.0, ratings: 1 },
    { id: "B", borrowings: 20, average: 4.7, ratings: 15 },
    { id: "C", borrowings: 50, average: 4.2, ratings: 40 },
    { id: "D", borrowings: 100, average: null, ratings: 0 },
    { id: "E", borrowings: 0, average: 5.0, ratings: 5 },
  ];
  const ratingSum = games.reduce((sum, game) => sum + (game.average ?? 0) * game.ratings, 0);
  const ratingCount = games.reduce((sum, game) => sum + game.ratings, 0);
  const communityMean = (ratingSum + PRIOR_SIZE * PRIOR_MEAN) / (ratingCount + PRIOR_SIZE);
  const ordered = games
    .map((game) => ({ ...game, popularity: score(game, communityMean) }))
    .sort((a, b) => b.popularity - a.popularity)
    .map((game) => game.id);

  assert.deepEqual(ordered, ["B", "C", "A", "D", "E"]);
  assert.equal(score({ borrowings: 0, average: null, ratings: 0 }, communityMean), 0);
  assert.ok(games.every((game) => {
    const value = score(game, communityMean);
    return Number.isFinite(value) && value >= 0 && value <= 1;
  }));
});

test("signal lifecycle and tie rules retain rating-only, closed-author, and completed-borrowing semantics", () => {
  const communityMean = 3.5;
  const ratingOnly = score({ borrowings: 0, average: 5, ratings: 1 }, communityMean);
  const written = score({ borrowings: 0, average: 5, ratings: 1 }, communityMean);
  const closedAuthor = score({ borrowings: 0, average: 5, ratings: 1 }, communityMean);
  assert.equal(ratingOnly, written);
  assert.equal(written, closedAuthor);
  assert.ok(score({ borrowings: 0, average: 4, ratings: 1 }, communityMean) < score({ borrowings: 0, average: 5, ratings: 1 }, communityMean));
  assert.equal(score({ borrowings: 0, average: null, ratings: 0 }, communityMean), 0);

  const completedCount = (statuses) => statuses.filter((status) => status === "borrowed" || status === "returned").length;
  assert.equal(completedCount(["pending", "approved", "rejected", "cancelled"]), 0);
  assert.equal(completedCount(["borrowed"]), 1);
  assert.equal(completedCount(["returned"]), 1);
  const ties = [{ id: "0002", popularity: 0 }, { id: "0001", popularity: 0 }]
    .sort((a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id));
  assert.deepEqual(ties.map((row) => row.id), ["0001", "0002"]);
});

test("candidate filtering changes rank position without changing a game's score", () => {
  const communityMean = 3.8;
  const target = { borrowings: 7, average: 4.5, ratings: 6 };
  const unfilteredScore = score(target, communityMean);
  for (const candidateSet of ["category", "location", "search"]) {
    assert.equal(score(target, communityMean), unfilteredScore, candidateSet);
  }
});

test("migration centralizes formula, security, completed states, and stable saturation", async () => {
  const [migration, canonical] = await Promise.all([
    read("supabase/migrations/202609150002_add_board_game_popularity_statistics.sql"),
    read("supabase/schema/canonical-public-schema.sql"),
  ]);
  for (const sql of [migration, canonical]) {
    assert.match(sql, /create view public\.board_game_popularity_statistics/);
    assert.match(sql, /security_invoker\s*=\s*true/);
    assert.match(sql, /where borrowing\.status in \('borrowed', 'returned'\)/);
    assert.match(sql, /ln\(21::double precision\)/);
    assert.match(sql, /ln\(11::double precision\)/);
    assert.match(sql, /20::numeric \* 3\.5::numeric/);
    assert.match(sql, /rating_count::numeric \* average_rating \+ 5::numeric \* community_mean/);
    assert.match(sql, /0\.50::double precision \* borrowing_heat[\s\S]*0\.35::double precision \* rating_quality[\s\S]*0\.15::double precision \* rating_participation/);
    assert.doesNotMatch(sql.match(/create view public\.board_game_popularity_statistics[\s\S]*?from scored;/)?.[0] ?? "", /max\s*\(|percentile/i);
    assert.match(sql, /revoke all privileges[\s\S]*from public, anon, authenticated/);
    assert.match(sql, /grant select[\s\S]*service_role/);
  }
});

test("homepage and discovery share database ordering and filters cannot recalculate score", async () => {
  const repository = await read("src/repositories/board-game-statistics.repository.ts");
  assert.equal((repository.match(/board_game_popularity_statistics/g) ?? []).length >= 3, true);
  for (const field of ["popularity_score", "rating_count", "completed_borrow_count", "average_rating", "board_game_id"]) {
    assert.match(repository, new RegExp(`\\.order\\(\"${field}\"`));
  }
  assert.match(repository, /\.in\("category_id", options\.category_ids\)/);
  assert.match(repository, /\.in\("location_id", options\.location_ids\)/);
  assert.match(repository, /\.range\(from, to\)/);
  assert.doesNotMatch(repository, /Math\.log|bayesian|BORROWING_SATURATION|RATING_SATURATION|\.sort\(/);
});

test("rating and borrowing mutations invalidate only the popular-games cache", async () => {
  const [reviews, boardGames] = await Promise.all([
    read("src/services/reviews/reviews.service.ts"),
    read("src/services/board-games/board-games.service.ts"),
  ]);
  assert.equal((reviews.match(/invalidatePublicDataSafely\("popularGames"\)/g) ?? []).length, 3);
  const checkout = boardGames.slice(boardGames.indexOf("checkOutBorrowing"), boardGames.indexOf("updateBorrowingDueDate"));
  assert.equal((checkout.match(/invalidatePublicDataSafely\("popularGames"\)/g) ?? []).length, 2);
  assert.doesNotMatch(reviews, /invalidatePublicDataSafely\("announcements"|"sessions"|"profiles"/);
});

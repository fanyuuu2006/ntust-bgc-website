import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadCommonJsModule(path) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    (specifier) => {
      if (specifier === "@/libs/query-params") {
        return {
          readSingleQueryValue(value) {
            const first = Array.isArray(value) ? value[0] : value;
            return typeof first === "string" && first.trim()
              ? first.trim()
              : undefined;
          },
        };
      }
      throw new Error(`Unexpected import: ${specifier}`);
    },
  );
  return runtimeModule.exports;
}

test("board-game cards present rating metadata instead of borrowing as popularity", async () => {
  const [card, rating] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
    readSource(
      "src/components/(public)/board-games/BoardGameRatingMetadata.tsx",
    ),
  ]);

  assert.match(card, /BoardGameRatingMetadata/);
  assert.match(rating, /averageRating === null|ratingCount <= 0/);
  assert.match(rating, /RatingStars/);
  assert.match(rating, /人評分/);
  assert.doesNotMatch(
    card + rating,
    /熱門度|completedBorrowCount|popularityScore|次借用/,
  );
});

test("card IA keeps identity, descriptive metadata, quiet asset reference, popularity, and one action", async () => {
  const [card, grid] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
    readSource("src/components/(public)/board-games/BoardGameGrid.tsx"),
  ]);

  assert.match(card, /boardGame: BoardGameDiscoveryItem/);
  assert.doesNotMatch(card + grid, /BoardGameWithCategoryAndLocation/);
  assert.match(card, /<h2/);
  assert.match(card, /title=\{boardGame\.category\.name\}/);
  assert.match(card, /title=\{boardGame\.location\.name\}/);
  assert.doesNotMatch(card, /metadata\.join/);
  assert.match(card, /shrink-0 whitespace-nowrap/);
  assert.match(card, /mt-auto[^>]*>[\s\S]*查看詳情/);
  assert.equal((card.match(/<Link\b/g) ?? []).length, 1);
  assert.doesNotMatch(card, /boardGame\.description|description\s*\?/);
  assert.doesNotMatch(card, /"use client"|useEffect|fetch\(/);
});

test("PostgREST unsatisfied ranges remain narrowly recognized by a shared repository helper", async () => {
  const helper = await loadCommonJsModule(
    "src/repositories/shared/postgrest.ts",
  );

  assert.equal(helper.isPostgrestRangeNotSatisfiable({ code: "PGRST103" }), true);
  assert.equal(helper.isPostgrestRangeNotSatisfiable({ code: "PGRST303" }), false);
  assert.equal(helper.isPostgrestRangeNotSatisfiable({}), false);
  assert.equal(helper.isPostgrestRangeNotSatisfiable(null), false);
});

test("board-game discovery converts only PGRST103 into an empty page with a filtered total", async () => {
  const repository = await readSource(
    "src/repositories/board-game-statistics.repository.ts",
  );

  assert.match(repository, /isPostgrestRangeNotSatisfiable\(error\)/);
  assert.match(repository, /select\(usesRankingView \? "board_game_id" : "id", \{ count: "exact", head: true \}\)/);
  assert.match(repository, /buildPaginationResult<BoardGameDiscoveryItem>\(\s*\[\]/);
  assert.match(repository, /if \(countError\)[\s\S]*throwRepositoryError/);
  assert.doesNotMatch(repository, /if \(error\) return buildPaginationResult/);
});

test("out-of-range pages retain legal range math and omit a misleading visible range", async () => {
  const [paginationUtils, paginationSummary] = await Promise.all([
    loadCommonJsModule("src/utils/pagination.tsx"),
    readSource("src/components/Pagination/PaginationSummary.tsx"),
  ]);

  assert.deepEqual(paginationUtils.getPageRange(2, 24, 11), {
    start: 0,
    end: 0,
  });
  assert.match(paginationSummary, /summary\.start > 0/);
});

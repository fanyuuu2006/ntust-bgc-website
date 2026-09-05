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
  new Function("exports", "module", javascript)(
    runtimeModule.exports,
    runtimeModule,
  );
  return runtimeModule.exports;
}

test("board-game cards present positive borrowing history as a semantic popularity signal", async () => {
  const [card, popularity] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
    readSource(
      "src/components/(public)/board-games/BoardGamePopularity.tsx",
    ),
  ]);

  assert.match(card, /BoardGamePopularity/);
  assert.match(popularity, /completedBorrowCount <= 0/);
  assert.match(popularity, /熱門度/);
  assert.match(popularity, /\{completedBorrowCount\} 次借用/);
  assert.doesNotMatch(popularity, /借用 \{completedBorrowCount\} 次/);
  assert.doesNotMatch(
    card + popularity,
    /\b(?:Star|Flame|TrendingUp)\b|%|冷門|超熱門|rating/i,
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
  assert.match(card, /metadata\.join/);
  assert.match(card, /sr-only[^>]*>社產編號/);
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
  assert.match(repository, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(repository, /buildPaginationResult<BoardGameWithStats>\(\s*\[\]/);
  assert.match(repository, /if \(countError\)[\s\S]*throwRepositoryError/);
  assert.doesNotMatch(repository, /if \(error\) return buildPaginationResult/);
});

test("out-of-range pages render a legal empty pagination summary", async () => {
  const [paginationUtils, pagination] = await Promise.all([
    loadCommonJsModule("src/utils/pagination.tsx"),
    readSource("src/components/Pagination/Pagination.tsx"),
  ]);

  assert.deepEqual(paginationUtils.getPageRange(2, 24, 11), {
    start: 0,
    end: 0,
  });
  assert.match(pagination, /目前頁面沒有資料，共 \{total\} 筆/);
});

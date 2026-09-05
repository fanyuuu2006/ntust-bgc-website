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

test("public board-game grid scales from two to six columns", async () => {
  const grid = await readSource(
    "src/components/(public)/board-games/BoardGameGrid.tsx",
  );

  assert.match(grid, /grid-cols-2/);
  assert.match(grid, /sm:grid-cols-3/);
  assert.match(grid, /sm:gap-4/);
  assert.match(grid, /md:grid-cols-4/);
  assert.match(grid, /xl:grid-cols-6/);
  assert.doesNotMatch(
    grid,
    /grid-cols-1|md:grid-cols-3|lg:grid-cols-4|md:gap-4|auto-fit|auto-fill/,
  );
});

test("public board-game page size accepts only its canonical grid-aligned values", async () => {
  const [constants, page, pageSizeSelect] = await Promise.all([
    loadCommonJsModule("src/app/(public)/board-games/constants.ts"),
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/components/Pagination/PaginationPageSizeSelect.tsx"),
  ]);

  assert.equal(constants.DEFAULT_PAGE_SIZE, 24);
  assert.deepEqual(constants.PAGE_SIZE_OPTIONS, [24, 36, 48, 60]);
  assert.equal(constants.normalizePageSize(undefined), 24);
  assert.equal(constants.normalizePageSize("24"), 24);
  assert.equal(constants.normalizePageSize("36"), 36);
  assert.equal(constants.normalizePageSize("48"), 48);
  assert.equal(constants.normalizePageSize("60"), 60);
  assert.equal(constants.normalizePageSize("12"), 24);
  assert.equal(constants.normalizePageSize("999"), 24);
  assert.equal(constants.normalizePageSize("invalid"), 24);

  assert.match(page, /normalizePageSize\(params\.pageSize\)/);
  assert.match(page, /pageSizeOptions=\{PAGE_SIZE_OPTIONS\}/);
  assert.match(
    page,
    /query=\{\{[\s\S]*search,[\s\S]*status:[\s\S]*category:[\s\S]*location:[\s\S]*sort:/,
  );
  assert.match(
    pageSizeSelect,
    /buildQueryString\(query, \{[\s\S]*pageSize: event\.target\.value,[\s\S]*page: 1/,
  );
});

test("public board-game card keeps one vertical composition at every breakpoint", async () => {
  const card = await readSource(
    "src/components/(public)/board-games/BoardGameCard.tsx",
  );

  assert.equal((card.match(/<Link\b/g) ?? []).length, 1);
  assert.match(card, /href=\{`\/board-games\/\$\{boardGame\.id\}`\}/);
  assert.match(card, /flex h-full min-w-0 flex-col/);
  assert.doesNotMatch(
    card,
    /flex-row|md:flex-col|w-26|shrink-0 self-start|md:w-full|md:aspect|md:border/,
  );
  assert.match(card, /flex min-w-0 flex-1 flex-col/);
  assert.match(card, /relative aspect-square/);
  assert.doesNotMatch(card, /aspect-square[^"\n]*\bp-[23]\b/);
  assert.match(card, /object-contain/);
  assert.doesNotMatch(card, /object-cover/);
  assert.match(card, /<h2/);
  assert.match(card, /line-clamp-2/);
  assert.match(card, /min-h-10[^"\n]*sm:min-h-11/);
  assert.match(
    card,
    /BoardGameStatusBadge[\s\S]*className="absolute[^"\n]*top-2[^"\n]*right-2/,
  );
  assert.match(card, /\.filter\(/);
  assert.match(card, /items-start justify-between gap-2/);
  assert.match(card, /sr-only[^>]*>社產編號/);
  assert.match(card, /#\{boardGame\.inventory_number\}/);
  assert.match(card, /description\s*\?/);
  assert.doesNotMatch(card, /尚未補充桌遊描述/);
  assert.match(card, /boardGame\.image\s*\?/);
  assert.match(card, /opacity-60/);
  assert.match(card, /mt-auto[^"\n]*pt-3[^>]*>[\s\S]*查看詳情/);
  assert.doesNotMatch(card, /translate-y|scale-\[/);
  assert.doesNotMatch(card, /"use client"|useEffect|fetch\(/);
});

test("public board-game page has one horizontal gutter owner", async () => {
  const page = await readSource("src/app/(public)/board-games/page.tsx");

  assert.match(page, /<section>/);
  assert.match(page, /<div className="container/);
  assert.doesNotMatch(page, /<section className="p-4">/);
});

test("public board-game header uses concise club-oriented discovery copy", async () => {
  const page = await readSource("src/app/(public)/board-games/page.tsx");

  assert.match(page, /探索社團桌遊，找到下一款想玩的遊戲。/);
  assert.doesNotMatch(
    page,
    /這裡提供|包含桌遊名稱|您可以使用搜尋功能|篩選條件來快速找到/,
  );
});

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const nodeRequire = createRequire(import.meta.url);

async function loadCommonJsModule(path, overrides = {}) {
  const source = await readFile(new URL(path, root), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  const localRequire = (specifier) => overrides[specifier] ?? nodeRequire(specifier);
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    localRequire,
  );
  return runtimeModule.exports;
}

test("Admin Board Games keeps valid fields when optional UUID filters are empty", async () => {
  const queryParams = await loadCommonJsModule("src/libs/query-params.ts");
  const { listAdminBoardGamesQuerySchema } = await loadCommonJsModule(
    "src/services/board-games/board-games.schema.ts",
    { "@/libs/query-params": queryParams },
  );

  assert.deepEqual(
    listAdminBoardGamesQuerySchema.parse({
      page: "1",
      pageSize: "20",
      orderBy: "inventory_number",
      orderDirection: "asc",
      status: "borrowed",
      category: "",
      location: "",
    }),
    {
      page: 1,
      pageSize: 20,
      orderBy: "inventory_number",
      orderDirection: "asc",
      status: "borrowed",
      category: undefined,
      location: undefined,
    },
  );
});

test("invalid Admin Board Game fields fall back independently", async () => {
  const queryParams = await loadCommonJsModule("src/libs/query-params.ts");
  const { listAdminBoardGamesQuerySchema } = await loadCommonJsModule(
    "src/services/board-games/board-games.schema.ts",
    { "@/libs/query-params": queryParams },
  );

  assert.deepEqual(
    listAdminBoardGamesQuerySchema.parse({
      search: " strategy ",
      status: "borrowed",
      category: "not-a-uuid",
      page: ["2", "9"],
    }),
    {
      search: "strategy",
      status: "borrowed",
      category: undefined,
      page: 2,
    },
  );
});

test("Admin Borrowings keeps search when blank scalar filters are ignored", async () => {
  const queryParams = await loadCommonJsModule("src/libs/query-params.ts");
  const { listBorrowingsQuerySchema } = await loadCommonJsModule(
    "src/services/board-games/board-games.schema.ts",
    { "@/libs/query-params": queryParams },
  );

  assert.deepEqual(
    listBorrowingsQuerySchema.parse({
      search: " test ",
      status: "",
      board_game_id: "",
      user_id: "",
      page: ["1", "2"],
    }),
    {
      search: "test",
      status: undefined,
      board_game_id: undefined,
      user_id: undefined,
      page: 1,
    },
  );
});

test("membership schemas retain valid fields when one field is invalid", async () => {
  const queryParams = await loadCommonJsModule("src/libs/query-params.ts");
  const { listAdminMembershipsQuerySchema, listMembershipRegisterKeysQuerySchema } =
    await loadCommonJsModule("src/services/memberships/memberships.schema.ts", {
      "@/libs/query-params": queryParams,
    });

  assert.deepEqual(
    listAdminMembershipsQuerySchema.parse({
      search: " member ",
      pageSize: "999",
      academic_year_id: "",
    }),
    { search: "member", pageSize: undefined, academic_year_id: undefined },
  );
  assert.deepEqual(
    listMembershipRegisterKeysQuerySchema.parse({
      status: "available",
      academic_year_id: "invalid",
      page: ["3", "4"],
    }),
    { status: "available", academic_year_id: undefined, page: 3 },
  );
});

test("shared scalar query normalization takes the first value and drops blanks", async () => {
  const { readSingleQueryValue, queryRecordFromSearchParams } = await loadCommonJsModule(
    "src/libs/query-params.ts",
  );

  assert.equal(readSingleQueryValue([" first ", "second"]), "first");
  assert.equal(readSingleQueryValue(["", "second"]), undefined);
  assert.equal(readSingleQueryValue("  "), undefined);
  assert.equal(readSingleQueryValue(undefined), undefined);
  assert.deepEqual(
    queryRecordFromSearchParams(new URLSearchParams("search=a&search=b&page=1")),
    { search: ["a", "b"], page: "1" },
  );
});

test("public board-game query keeps only valid multi-value UUID filters", async () => {
  const queryParams = await loadCommonJsModule("src/libs/query-params.ts");
  const constants = await loadCommonJsModule(
    "src/app/(public)/board-games/constants.ts",
  );
  const { normalizePublicBoardGamesQuery } = await loadCommonJsModule(
    "src/app/(public)/board-games/query.ts",
    {
      "@/libs/query-params": queryParams,
      "./constants": constants,
    },
  );
  const firstId = "11111111-1111-4111-8111-111111111111";
  const secondId = "22222222-2222-4222-8222-222222222222";

  assert.deepEqual(
    normalizePublicBoardGamesQuery({
      search: [" game ", "ignored"],
      page: ["2", "9"],
      category: [firstId, "invalid", ""],
      location: ["", secondId],
      status: ["available", "invalid", "borrowed"],
    }),
    {
      page: 2,
      pageSize: 24,
      search: "game",
      statuses: ["available", "borrowed"],
      categoryIds: [firstId],
      locationIds: [secondId],
      sortOption: {
        key: "popular",
        label: "熱門程度",
        orderBy: "popular",
        orderDirection: "desc",
      },
    },
  );
});

test("route page-size normalization rejects unsupported memberships values", async () => {
  const { normalizePageSizeOption } = await loadCommonJsModule(
    "src/libs/query-params.ts",
  );

  assert.equal(normalizePageSizeOption("999", [12, 24, 48], 12), 12);
  assert.equal(normalizePageSizeOption(["24", "999"], [12, 24, 48], 12), 24);
});

test("pagination rejects fractional, repeated-invalid, and excessive values safely", async () => {
  const queryParams = await loadCommonJsModule("src/libs/query-params.ts");
  const { parsePage, parsePageSize } = await loadCommonJsModule(
    "src/utils/pagination.tsx",
    { "@/libs/query-params": queryParams },
  );

  assert.equal(parsePage(["3", "9"]), 3);
  assert.equal(parsePage("1.5"), 1);
  assert.equal(parsePage("-2"), 1);
  assert.equal(parsePageSize("1.5", 20, 100), 20);
  assert.equal(parsePageSize("999", 20, 100), 100);
});

test("manual list routes normalize raw scalar search params before use", async () => {
  const paths = [
    "src/app/(public)/announcements/page.tsx",
    "src/app/(authenticated)/borrowings/page.tsx",
    "src/app/(authenticated)/memberships/page.tsx",
    "src/app/(admin)/admin/users/page.tsx",
    "src/app/(admin)/admin/academic-years/page.tsx",
    "src/app/(admin)/admin/announcements/page.tsx",
    "src/app/(admin)/admin/events/page.tsx",
    "src/app/(admin)/admin/events/[id]/page.tsx",
    "src/app/(admin)/admin/officers/page.tsx",
    "src/app/(admin)/admin/board-games/categories/page.tsx",
    "src/app/(admin)/admin/board-games/locations/page.tsx",
  ];
  const sources = await Promise.all(
    paths.map((path) => readFile(new URL(path, root), "utf8")),
  );

  for (const source of sources) {
    assert.match(source, /readSingleQueryValue|parsePage\(params\.page\)/);
  }
});

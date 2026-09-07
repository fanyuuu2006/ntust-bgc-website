import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const nodeRequire = createRequire(import.meta.url);

async function loadCommonJsModule(path, overrides = {}) {
  const source = await readFile(new URL(path, root), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
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

test("Search owns only search and preserves applied filters, sort, page size, and repeated values", async () => {
  const { buildOwnedQueryHref } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );
  const applied = new URLSearchParams(
    "search=old&status=available&status=borrowed&sort=popular&page=7&pageSize=24",
  );

  assert.equal(
    buildOwnedQueryHref({
      basePath: "/board-games",
      appliedQuery: applied,
      ownedKeys: ["search"],
      changes: { search: "new" },
    }),
    "/board-games?status=available&status=borrowed&sort=popular&page=1&pageSize=24&search=new",
  );
});

test("Sort navigation cannot apply an unsubmitted Search or filter draft", async () => {
  const { buildOwnedQueryHref } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );
  const applied = new URLSearchParams(
    "search=old&status=available&sort=popular&page=3&pageSize=24",
  );

  assert.equal(
    buildOwnedQueryHref({
      basePath: "/board-games",
      appliedQuery: applied,
      ownedKeys: ["sort"],
      changes: { sort: "name-asc" },
    }),
    "/board-games?search=old&status=available&page=1&pageSize=24&sort=name-asc",
  );
});

test("Filter Apply replaces only its owned multi-value keys", async () => {
  const { buildOwnedQueryHref } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );
  const applied = new URLSearchParams(
    "search=strategy&status=available&category=old&location=room-a&sort=popular&page=5&pageSize=36",
  );

  assert.equal(
    buildOwnedQueryHref({
      basePath: "/board-games",
      appliedQuery: applied,
      ownedKeys: ["status", "category", "location"],
      changes: {
        status: ["available", "borrowed"],
        category: ["party", "strategy"],
        location: undefined,
      },
    }),
    "/board-games?search=strategy&sort=popular&page=1&pageSize=36&status=available&status=borrowed&category=party&category=strategy",
  );
});

test("Clear removes only the owned key and blank changes are omitted", async () => {
  const { buildOwnedQueryHref } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );

  assert.equal(
    buildOwnedQueryHref({
      basePath: "/borrowings",
      appliedQuery: new URLSearchParams(
        "search=game&status=pending&sort=newest&page=4&pageSize=20",
      ),
      ownedKeys: ["search"],
      changes: { search: "   " },
    }),
    "/borrowings?status=pending&sort=newest&page=1&pageSize=20",
  );
});

test("preserved form fields exclude page and the form-owned keys", async () => {
  const { getPreservedQueryEntries } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );

  assert.deepEqual(
    getPreservedQueryEntries(
      {
        search: "old",
        status: ["available", "borrowed"],
        sort: "popular",
        page: 9,
        pageSize: 24,
      },
      ["search"],
    ),
    [
      ["status", "available"],
      ["status", "borrowed"],
      ["sort", "popular"],
      ["pageSize", "24"],
    ],
  );
});

test("query navigation helper remains route-agnostic and does not normalize feature values", async () => {
  const { buildOwnedQueryHref } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );

  assert.equal(
    buildOwnedQueryHref({
      basePath: "/any-feature",
      appliedQuery: { arbitrary: "kept", page: 8 },
      ownedKeys: ["custom"],
      changes: { custom: "feature-defined-value" },
    }),
    "/any-feature?arbitrary=kept&page=1&custom=feature-defined-value",
  );
});

test("preserved query fields render only applied unrelated state plus a page reset", async () => {
  const queryNavigation = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );
  const { PreservedQueryFields } = await loadCommonJsModule(
    "src/components/query/PreservedQueryFields.tsx",
    { "@/libs/query-navigation": queryNavigation },
  );

  const html = renderToStaticMarkup(
    React.createElement(PreservedQueryFields, {
      query: {
        search: "applied",
        status: ["available", "borrowed"],
        sort: "popular",
        page: 6,
        pageSize: 24,
      },
      ownedKeys: ["search"],
    }),
  );

  assert.match(html, /name="page" value="1"/);
  assert.doesNotMatch(html, /name="search"/);
  assert.equal((html.match(/name="status"/g) ?? []).length, 2);
  assert.match(html, /name="sort" value="popular"/);
  assert.match(html, /name="pageSize" value="24"/);
});

test("immediate select delegates one owned key to the pure navigation adapter", async () => {
  const source = await readFile(
    new URL("src/components/query/ImmediateQuerySelect.tsx", root),
    "utf8",
  );

  assert.match(source, /buildOwnedQueryHref/);
  assert.match(source, /ownedKeys:\s*\[queryKey\]/);
  assert.match(source, /changes:\s*\{\s*\[queryKey\]: event\.target\.value/);
  assert.doesNotMatch(source, /FormData/);
  assert.match(source, /basePath: string/);
  assert.match(source, /appliedQuery: AppliedQuery/);
  assert.doesNotMatch(source, /useSearchParams|usePathname/);
});

test("Public Board Games separates Search, filter Apply, and immediate sort ownership", async () => {
  const [toolbar, filters] = await Promise.all([
    readFile(
      new URL("src/components/(public)/board-games/BoardGameSearchForm.tsx", root),
      "utf8",
    ),
    readFile(
      new URL("src/components/(public)/board-games/BoardGameFilterDisclosure.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(toolbar, /PreservedQueryFields/);
  assert.match(toolbar, /ownedKeys=\{\["search"\]\}/);
  assert.match(toolbar, /ImmediateQuerySelect/);
  assert.match(toolbar, /queryKey="sort"/);
  assert.match(filters, /<QueryFilterForm/);
  assert.match(filters, /clearHref=\{clearFiltersHref\}/);
  assert.match(filters, /篩選 \(\$\{activeFilterCount\}\)/);
});

test("authenticated Borrowings keeps Search and filter drafts out of immediate sort", async () => {
  const source = await readFile(
    new URL("src/app/(authenticated)/borrowings/page.tsx", root),
    "utf8",
  );

  assert.match(source, /PreservedQueryFields/);
  assert.match(source, /ownedKeys=\{\["search"\]\}/);
  assert.match(source, /ImmediateQuerySelect/);
  assert.match(source, /queryKey="sort"/);
  assert.match(source, /QueryFilterForm/);
  assert.match(source, /clearHref=\{clearFiltersHref\}/);
});

test("Memberships gives its grouped filters their own Apply and Clear actions", async () => {
  const source = await readFile(
    new URL(
      "src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx",
      root,
    ),
    "utf8",
  );

  assert.match(source, /ownedKeys=\{\["search"\]\}/);
  assert.match(source, /ownedKeys=\{\["type", "status"\]\}/);
  assert.match(source, /queryKey="orderDirection"/);
  assert.match(source, /QueryFilterForm/);
  assert.match(source, /clearHref=\{clearFiltersHref\}/);
});

test("Admin grouped-filter toolbars keep Search and filter form ownership separate", async () => {
  const paths = [
    "src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx",
    "src/components/(admin)/admin/memberships/MembershipFilterBar.tsx",
    "src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx",
  ];
  const sources = await Promise.all(
    paths.map((path) => readFile(new URL(path, root), "utf8")),
  );

  for (const source of sources) {
    assert.match(source, /PreservedQueryFields/);
    assert.match(source, /ownedKeys=\{\["search"\]\}/);
    assert.match(source, /QueryFilterForm/);
    assert.match(source, /clearHref=\{clearFiltersHref\}/);
    assert.equal((source.match(/<form/g) ?? []).length, 1);
  }

  assert.match(sources[0], /ownedKeys=\{\["status", "category", "location"\]\}/);
  assert.match(sources[1], /ownedKeys=\{\["academic_year_id", "status"\]\}/);
  assert.match(sources[2], /ownedKeys=\{\["academic_year_id", "status"\]\}/);
});

test("Admin standalone scalar controls navigate immediately without joining the Search form", async () => {
  const cases = [
    ["src/app/(admin)/admin/announcements/page.tsx", ["status", "orderBy"]],
    ["src/app/(admin)/admin/events/page.tsx", ["status", "orderBy"]],
    ["src/app/(admin)/admin/officers/page.tsx", ["academicYearId"]],
    ["src/app/(admin)/admin/events/[id]/page.tsx", ["orderDirection"]],
  ];

  for (const [path, keys] of cases) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /PreservedQueryFields/);
    assert.match(source, /ownedKeys=\{\["search"\]\}/);
    for (const key of keys) {
      assert.match(source, new RegExp(`queryKey="${key}"`));
    }
  }
});

test("Admin Borrowings Search, status, and compound sort mutate only their owned keys", async () => {
  const source = await readFile(
    new URL(
      "src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx",
      root,
    ),
    "utf8",
  );

  assert.match(source, /buildOwnedQueryHref/);
  assert.match(source, /ownedKeys:\s*\["search"\]/);
  assert.match(source, /queryKey="status"/);
  assert.match(source, /ownedKeys:\s*\["orderBy", "orderDirection"\]/);
  assert.doesNotMatch(source, /formData\.get\("status"\)/);
  assert.doesNotMatch(source, /formData\.get\("sort"\)/);
});

test("grouped Clear removes only owned filters and preserves applied context", async () => {
  const { buildOwnedQueryHref } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );

  assert.equal(
    buildOwnedQueryHref({
      basePath: "/board-games",
      appliedQuery: new URLSearchParams(
        "search=old&status=available&status=borrowed&category=party&sort=popular&page=8&pageSize=36",
      ),
      ownedKeys: ["status", "category", "location"],
      changes: {},
    }),
    "/board-games?search=old&sort=popular&page=1&pageSize=36",
  );
});

test("grouped Clear resets applied and unapplied owned drafts only", async () => {
  const { clearOwnedFilterDraft } = await loadCommonJsModule(
    "src/components/query/QueryFilterForm.tsx",
    {
      "next/navigation": { useRouter: () => ({ push() {} }) },
      "@/components/ui/Button": {},
      "@/libs/query-navigation": {},
      "@/utils/className": { cn: (...values) => values.filter(Boolean).join(" ") },
    },
  );
  const controls = [
    { name: "status", type: "checkbox", value: "available", checked: true },
    { name: "status", type: "checkbox", value: "borrowed", checked: true },
    { name: "category", type: "select-one", value: "party" },
    { name: "search", type: "hidden", value: "old" },
    { name: "sort", type: "hidden", value: "popular" },
    { name: "pageSize", type: "hidden", value: "36" },
  ];

  clearOwnedFilterDraft(controls, ["status", "category", "location"]);

  assert.equal(controls[0].checked, false);
  assert.equal(controls[1].checked, false);
  assert.equal(controls[2].value, "");
  assert.equal(controls[3].value, "old");
  assert.equal(controls[4].value, "popular");
  assert.equal(controls[5].value, "36");
});

test("owned applied-state key resynchronizes Apply, Clear, Back, and Forward", async () => {
  const { getOwnedQueryStateKey } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );
  const keys = ["status", "category", "location"];
  const filtered = new URLSearchParams(
    "search=old&status=available&status=borrowed&sort=popular",
  );
  const cleared = new URLSearchParams("search=old&sort=popular");

  const filteredKey = getOwnedQueryStateKey(filtered, keys);
  const clearedKey = getOwnedQueryStateKey(cleared, keys);

  assert.notEqual(filteredKey, clearedKey);
  assert.equal(getOwnedQueryStateKey(filtered, keys), filteredKey);
  assert.equal(getOwnedQueryStateKey(cleared, keys), clearedKey);
});

test("every grouped filter delegates Clear and Apply lifecycle to QueryFilterForm", async () => {
  const paths = [
    "src/components/(public)/board-games/BoardGameFilterDisclosure.tsx",
    "src/app/(authenticated)/borrowings/page.tsx",
    "src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx",
    "src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx",
    "src/components/(admin)/admin/memberships/MembershipFilterBar.tsx",
    "src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx",
  ];

  for (const path of paths) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /QueryFilterForm/);
    assert.doesNotMatch(source, /ButtonLink href=\{clearFiltersHref\}/);
  }

  const sharedForm = await readFile(
    new URL("src/components/query/QueryFilterForm.tsx", root),
    "utf8",
  );
  assert.match(sharedForm, /key=\{appliedStateKey\}/);
  assert.match(sharedForm, /clearOwnedFilterDraft\(controls, ownedKeys\)/);
  assert.ok(
    sharedForm.indexOf("clearOwnedFilterDraft(controls, ownedKeys)") <
      sharedForm.indexOf("router.push(clearHref)"),
  );
});

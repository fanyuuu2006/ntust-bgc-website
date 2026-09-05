import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

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

test("query-string overrides preserve unrelated values and remove cleared values", async () => {
  const { buildQueryString } = await loadCommonJsModule("src/utils/url.tsx");

  assert.equal(
    buildQueryString(
      {
        search: "璀璨寶石",
        status: "borrowed",
        sort: "due_at:asc",
        page: 4,
        pageSize: 20,
      },
      { search: "璀璨寶石", page: 1 },
    ),
    "search=%E7%92%80%E7%92%A8%E5%AF%B6%E7%9F%B3&status=borrowed&sort=due_at%3Aasc&page=1&pageSize=20",
  );

  assert.equal(
    buildQueryString(
      { search: "璀璨寶石", status: "borrowed", page: 3, pageSize: 50 },
      { search: undefined, page: 1 },
    ),
    "status=borrowed&page=1&pageSize=50",
  );
});

test("shared search input owns search and clear affordances for every route group", async () => {
  const sharedPath = "src/components/query/ClearableSearchInput.tsx";
  await access(new URL(sharedPath, root));
  const shared = await readSource(sharedPath);
  const consumers = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx"),
    readSource("src/app/(admin)/admin/users/page.tsx"),
  ]);

  assert.match(shared, /<Search/);
  assert.match(shared, /aria-label="清除搜尋"/);
  assert.match(shared, /router\.replace\(clearHref\)/);
  for (const source of consumers) {
    assert.match(source, /@\/components\/query\/ClearableSearchInput/);
    assert.doesNotMatch(source, /import \{[^}]*\bSearch\b[^}]*\} from "lucide-react"/);
  }
});

test("explicit public and authenticated search forms use the primary text-only search action", async () => {
  const sources = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /<Button type="submit" variant="primary"/);
    assert.match(source, />\s*搜尋\s*<\/Button>/);
    assert.doesNotMatch(source, />\s*(?:套用|搜詢)\s*<\/Button>/);
  }
});

test("query forms intentionally reset page while preserving valid page size", async () => {
  const sources = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /name="page" value="1"/);
    assert.match(source, /name="pageSize"/);
  }
});

test("query-empty recovery receives each route's explicit canonical dataset URL", async () => {
  const primitivePath = "src/components/query/QueryEmptyState.tsx";
  await access(new URL(primitivePath, root));
  const [primitive, boardGames, borrowings, memberships, announcements] = await Promise.all([
    readSource(primitivePath),
    readSource("src/components/(public)/board-games/BoardGameGrid.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipHistory.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
  ]);

  assert.match(primitive, /clearHref: string/);
  assert.match(primitive, /href=\{clearHref\}/);
  assert.match(primitive, /清除條件/);
  assert.doesNotMatch(primitive, /usePathname|pathname/);
  assert.match(boardGames, /clearHref=\{BASE_PATH\}/);
  assert.match(borrowings, /clearHref=\{BASE_PATH\}/);
  assert.match(memberships, /clearHref="\/memberships"/);
  assert.match(announcements, /clearHref="\/announcements"/);
});

test("pagination uses a semantic URL-preserving page selector with safe edge states", async () => {
  const [pagination, pageSelect, pageSizeSelect, navLinks] = await Promise.all([
    readSource("src/components/Pagination/Pagination.tsx"),
    readSource("src/components/Pagination/PaginationPageSelect.tsx"),
    readSource("src/components/Pagination/PaginationPageSizeSelect.tsx"),
    readSource("src/components/Pagination/PaginationNavLinks.tsx"),
  ]);

  assert.match(pagination, /<nav/);
  assert.match(pagination, /aria-label="分頁"/);
  assert.match(pageSelect, /aria-label="前往頁碼"/);
  assert.match(pageSelect, /目前第 \{page\} 頁，共 \{totalPages\} 頁/);
  assert.match(pageSelect, /page: event\.target\.value/);
  assert.match(pageSizeSelect, /page: 1/);
  assert.match(navLinks, /buildQueryString\(query/);
  assert.match(navLinks, /if \(disabled\) \{[\s\S]*?<span[\s\S]*?aria-disabled="true"[\s\S]*?<\/span>[\s\S]*?\}/);
  assert.match(navLinks, /return \(\s*<Link/);
});

test("page-size controls remain only where the audited product task benefits", async () => {
  const [boardGames, borrowings, memberships, announcements, adminUsers] = await Promise.all([
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/app/(authenticated)/memberships/page.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(admin)/admin/users/page.tsx"),
  ]);

  assert.doesNotMatch(boardGames, /showPageSize=\{false\}/);
  assert.match(borrowings, /showPageSize=\{false\}/);
  assert.match(memberships, /showPageSize=\{false\}/);
  assert.match(announcements, /showPageSize=\{false\}/);
  assert.doesNotMatch(adminUsers, /showPageSize=\{false\}/);
});

test("Admin Borrowings exposes only established sort fields and resets page", async () => {
  const source = await readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx");

  assert.match(source, /name="sort"/);
  assert.match(source, /created_at:desc/);
  assert.match(source, /borrowed_at:desc/);
  assert.match(source, /due_at:asc/);
  assert.match(source, /returned_at:desc/);
  assert.match(source, /page: "1"/);
});

test("Admin query forms preserve page size and explicitly reset page", async () => {
  const nativeForms = await Promise.all([
    readSource("src/app/(admin)/admin/users/page.tsx"),
    readSource("src/app/(admin)/admin/academic-years/page.tsx"),
    readSource("src/app/(admin)/admin/board-games/categories/page.tsx"),
    readSource("src/app/(admin)/admin/board-games/locations/page.tsx"),
    readSource("src/app/(admin)/admin/officers/page.tsx"),
    readSource("src/app/(admin)/admin/events/page.tsx"),
    readSource("src/app/(admin)/admin/events/[id]/page.tsx"),
    readSource("src/app/(admin)/admin/announcements/page.tsx"),
  ]);

  for (const source of nativeForms) {
    assert.match(source, /name="page" value="1"/);
    assert.match(source, /name="pageSize"/);
  }

  const [memberships, registerKeys, boardGames] = await Promise.all([
    readSource("src/components/(admin)/admin/memberships/MembershipFilterBar.tsx"),
    readSource("src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx"),
    readSource("src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx"),
  ]);
  for (const source of [memberships, registerKeys, boardGames]) {
    assert.match(source, /pageSize: query\.pageSize/);
    assert.match(source, /page: (?:"1"|1)/);
  }
  assert.match(memberships, /orderDirection: query\.orderDirection/);
  assert.match(registerKeys, /orderDirection: query\.orderDirection/);
});

test("Admin zero-result views distinguish active queries from empty datasets", async () => {
  const sources = await Promise.all([
    readSource("src/app/(admin)/admin/users/page.tsx"),
    readSource("src/app/(admin)/admin/announcements/page.tsx"),
    readSource("src/components/(admin)/admin/board-games/BoardGameTable.tsx"),
    readSource("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
    readSource("src/components/(admin)/admin/memberships/RegisterKeyTable.tsx"),
    readSource("src/components/(admin)/admin/events/EventRecords.tsx"),
    readSource("src/components/(admin)/admin/events/AttendanceRecords.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /QueryEmptyState/);
    assert.match(source, /clearHref=/);
  }
});

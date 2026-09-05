import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("shared filter disclosure uses native semantics with mobile flow and desktop floating chrome", async () => {
  const path = "src/components/query/QueryFilterDisclosure.tsx";
  await access(new URL(path, root));
  const source = await readSource(path);

  assert.match(source, /<details/);
  assert.match(source, /<summary/);
  assert.match(source, /ListFilter[^\n]*aria-hidden="true"|aria-hidden="true"[^\n]*ListFilter/);
  assert.match(source, /shrink-0/);
  assert.match(source, /whitespace-nowrap/);
  assert.match(source, /marker:content-none/);
  assert.match(source, /mt-2/);
  assert.match(source, /lg:absolute/);
  assert.match(source, /lg:right-0/);
  assert.match(source, /lg:shadow-/);
  assert.match(source, /max-w-\[calc\(100vw-/);
  assert.doesNotMatch(source, /"use client"|useState|useEffect|useRouter|fetch\(/);
});

test("authenticated Borrowings and Memberships share native disclosure without changing GET query fields", async () => {
  const [borrowings, memberships] = await Promise.all([
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx"),
  ]);

  for (const source of [borrowings, memberships]) {
    assert.match(source, /QueryFilterDisclosure/);
    assert.doesNotMatch(source, /<details|<summary/);
    assert.match(source, /<form[\s\S]*?<QueryFilterDisclosure[\s\S]*?<Select[\s\S]*?<\/QueryFilterDisclosure>[\s\S]*?<\/form>/);
    assert.match(source, /name="page" value="1"/);
    assert.match(source, /name="pageSize"/);
  }

  assert.match(borrowings, /name="status"/);
  assert.match(memberships, /name="type"/);
  assert.match(memberships, /name="status"/);
});

test("multi-filter Admin toolbars use the shared native disclosure and preserve URL navigation inputs", async () => {
  const routes = [
    {
      path: "src/components/(admin)/admin/memberships/MembershipFilterBar.tsx",
      fields: ['name="academic_year_id"', 'name="status"'],
    },
    {
      path: "src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx",
      fields: ['name="academic_year_id"', 'name="status"'],
    },
    {
      path: "src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx",
      fields: ['name="status"', 'name="category"', 'name="location"'],
    },
  ];

  for (const route of routes) {
    const source = await readSource(route.path);
    assert.match(source, /QueryFilterDisclosure/);
    assert.match(source, /<form[\s\S]*?<QueryFilterDisclosure[\s\S]*?<\/QueryFilterDisclosure>[\s\S]*?<\/form>/);
    assert.match(source, /<form method="GET" action=/);
    assert.match(source, /name="page" value="1"/);
    assert.match(source, /name="pageSize"/);
    assert.doesNotMatch(source, /"use client"|preventDefault|useRouter|fetch\(|@\/repositories/);
    for (const field of route.fields) assert.ok(source.includes(field));
  }
});

test("filter utility surfaces use compact mobile spacing without shrinking readable controls", async () => {
  const [shared, publicForm, publicDisclosure, borrowings, memberships] =
    await Promise.all([
      readSource("src/components/query/QueryFilterDisclosure.tsx"),
      readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
      readSource("src/components/(public)/board-games/BoardGameFilterDisclosure.tsx"),
      readSource("src/app/(authenticated)/borrowings/page.tsx"),
      readSource(
        "src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx",
      ),
    ]);

  assert.match(shared, /gap-3/);
  assert.match(shared, /p-3/);
  assert.doesNotMatch(shared, /gap-4|p-4/);

  assert.match(publicForm, /className="space-y-2"/);
  assert.match(publicForm, /items-start gap-2/);
  assert.match(publicDisclosure, /grid-cols-2/);
  assert.match(publicDisclosure, /sm:grid-cols-1/);
  assert.match(publicDisclosure, /min-h-8/);
  assert.match(publicDisclosure, /text-sm/);

  for (const source of [borrowings, memberships]) {
    assert.match(source, /<form[^>]*className="space-y-2"/);
  }

  for (const source of [shared, publicForm, publicDisclosure, borrowings, memberships]) {
    assert.doesNotMatch(source, /overflow-x-hidden/);
  }
  assert.doesNotMatch(publicDisclosure, /max-h-|overflow-y-auto|text-xs[^\n]*option/);
});

test("multi-filter Admin toolbar density is owned by feature composition", async () => {
  const sources = await Promise.all([
    readSource("src/components/(admin)/admin/memberships/MembershipFilterBar.tsx"),
    readSource("src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx"),
    readSource("src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /grid grid-cols-1 gap-2/);
    assert.doesNotMatch(source, /overflow-x-hidden|text-xs/);
  }
});

test("disclosed Admin fields keep visible feature-owned labels", async () => {
  const [memberships, registerKeys, boardGames] = await Promise.all([
    readSource("src/components/(admin)/admin/memberships/MembershipFilterBar.tsx"),
    readSource("src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx"),
    readSource("src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx"),
  ]);

  assert.match(memberships, /<FilterSelect[\s\S]*?label="學年度"/);
  assert.match(memberships, /<FilterSelect[\s\S]*?label="狀態"/);
  assert.match(registerKeys, /<label[^>]*>[\s\S]*?學年度[\s\S]*?<Select[\s\S]*?name="academic_year_id"/);
  assert.match(registerKeys, /<label[^>]*>[\s\S]*?狀態[\s\S]*?<Select[\s\S]*?name="status"/);
  assert.match(boardGames, /<FilterSelect[\s\S]*?label="狀態"/);
  assert.match(boardGames, /<FilterSelect[\s\S]*?label="分類"/);
  assert.match(boardGames, /<FilterSelect[\s\S]*?label="位置"/);
});

test("single high-frequency Admin filters intentionally remain directly available", async () => {
  const routes = [
    ["src/app/(admin)/admin/officers/page.tsx", 'name="academicYearId"'],
    ["src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx", 'name="status"'],
    ["src/app/(admin)/admin/events/page.tsx", 'name="status"'],
    ["src/app/(admin)/admin/announcements/page.tsx", 'name="status"'],
  ];

  for (const [path, field] of routes) {
    const source = await readSource(path);
    assert.ok(source.includes(field));
    assert.doesNotMatch(source, /QueryFilterDisclosure/);
  }
});

test("Public Board Games keeps a query-neutral interaction island with mobile flow and desktop floating panel", async () => {
  const [form, disclosure] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource("src/components/(public)/board-games/BoardGameFilterDisclosure.tsx"),
  ]);

  assert.match(form, /<form method="GET"[\s\S]*?<BoardGameFilterDisclosure[\s\S]*?<\/form>/);
  assert.match(form, /relative/);
  assert.match(disclosure, /aria-expanded=\{isOpen\}/);
  assert.match(disclosure, /col-span-full/);
  assert.match(disclosure, /lg:absolute/);
  assert.match(disclosure, /lg:right-0/);
  assert.match(disclosure, /lg:top-full/);
  assert.match(disclosure, /lg:shadow-/);
  for (const name of ["status", "category", "location"]) {
    assert.match(disclosure, new RegExp(`name=\\{name\\}[\\s\\S]*?value=\\{option\\.value\\}`));
    assert.ok(form.includes(`${name}Options=`) || disclosure.includes(`name="${name}"`));
  }
  assert.doesNotMatch(disclosure, /useSearchParams|useRouter|fetch\(|@\/services|@\/repositories/);
});

test("filter convergence does not move result data fetching to the client", async () => {
  const serverResults = await Promise.all([
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/components/(authenticated)/borrowings/BorrowingsResults.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsResults.tsx"),
    readSource("src/app/(admin)/admin/memberships/page.tsx"),
    readSource("src/app/(admin)/admin/memberships/register-keys/page.tsx"),
    readSource("src/app/(admin)/admin/board-games/page.tsx"),
  ]);

  for (const source of serverResults) {
    assert.doesNotMatch(source, /"use client"|useEffect|fetch\(/);
  }
});

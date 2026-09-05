import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("shared form and pagination controls preserve flexible and intrinsic sizing", async () => {
  const [input, navLinks] = await Promise.all([
    readSource("src/components/ui/Input.tsx"),
    readSource("src/components/Pagination/PaginationNavLinks.tsx"),
  ]);

  assert.match(input, /formControlClassName\s*=\s*[\s\S]*?min-w-0/);
  assert.match(navLinks, /inline-flex[^"\n]*whitespace-nowrap/);
});

test("authenticated query toolbars defer the four-control desktop row and keep filter actions intrinsic", async () => {
  const [memberships, borrowings, disclosure] = await Promise.all([
    readSource("src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/query/QueryFilterDisclosure.tsx"),
  ]);

  for (const source of [memberships, borrowings]) {
    assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_auto_auto_auto\]/);
    assert.match(source, /QueryFilterDisclosure/);
  }
  assert.match(disclosure, /<summary className="[^"]*shrink-0[^"]*whitespace-nowrap|<summary className="[^"]*whitespace-nowrap[^"]*shrink-0/);
  assert.doesNotMatch(memberships, /sm:flex-row/);
});

test("Board Game expanded filters are a feature-local full-width flow item", async () => {
  const disclosurePath = "src/components/(public)/board-games/BoardGameFilterDisclosure.tsx";
  await access(new URL(disclosurePath, root));

  const [form, disclosure] = await Promise.all([
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource(disclosurePath),
  ]);

  assert.match(form, /BoardGameFilterDisclosure/);
  assert.doesNotMatch(form, /<details/);
  assert.match(disclosure, /aria-expanded=\{isOpen\}/);
  assert.match(disclosure, /col-span-full/);
  assert.match(disclosure, /order-last/);
  assert.doesNotMatch(disclosure, /useSearchParams|fetch\(|@\/services|@\/repositories/);
});

test("Admin desktop layout uses document scrolling while the mobile drawer remains viewport-bound", async () => {
  const [shell, sidebar] = await Promise.all([
    readSource("src/components/layouts/AdminShell.tsx"),
    readSource("src/components/(admin)/AdminSidebar.tsx"),
  ]);

  assert.match(shell, /min-h-dvh/);
  assert.doesNotMatch(shell, /className="flex h-dvh|overflow-hidden|overflow-y-auto/);
  assert.match(sidebar, /fixed[\s\S]*h-dvh/);
  assert.match(sidebar, /overflow-y-auto/);
});

test("query-heavy authenticated routes stream only server-rendered result regions", async () => {
  const routeLoadingFiles = [
    "src/app/(authenticated)/borrowings/loading.tsx",
    "src/app/(authenticated)/memberships/loading.tsx",
  ];
  for (const path of routeLoadingFiles) {
    await assert.rejects(access(new URL(path, root)));
  }

  const [borrowingsPage, borrowingResults, membershipsPage, membershipResults] = await Promise.all([
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/borrowings/BorrowingsResults.tsx"),
    readSource("src/app/(authenticated)/memberships/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsResults.tsx"),
  ]);

  for (const page of [borrowingsPage, membershipsPage]) {
    assert.match(page, /import \{ Suspense \} from "react"/);
    assert.match(page, /<Suspense[\s\S]*?fallback=/);
    assert.match(page, /<PageHeader[\s\S]*?<Suspense/);
    assert.doesNotMatch(page, /"use client"|fetch\(/);
  }

  assert.match(borrowingsPage, /<BorrowingsToolbar[\s\S]*?<Suspense/);
  assert.match(membershipsPage, /<MembershipRecordsToolbar[\s\S]*?<Suspense/);

  assert.match(borrowingResults, /export async function BorrowingsResults/);
  assert.equal((borrowingResults.match(/getBorrowingsByUserId\(/g) ?? []).length, 1);
  assert.doesNotMatch(borrowingResults, /"use client"|fetch\(|useEffect|useSearchParams/);

  assert.match(membershipResults, /export async function MembershipRecordsResults/);
  assert.equal((membershipResults.match(/listMembershipRecordsByUserId\(/g) ?? []).length, 1);
  assert.doesNotMatch(membershipResults, /"use client"|fetch\(|useEffect|useSearchParams/);
});

test("public direct-query result paths remain server-rendered", async () => {
  const routes = [
    {
      path: "src/app/(public)/board-games/page.tsx",
      serviceCall: /boardGamesService\.listBoardGamesWithCategoryAndLocation\(/,
    },
    {
      path: "src/app/(public)/announcements/page.tsx",
      serviceCall: /announcementsService\.listPublished\(/,
    },
  ];

  for (const route of routes) {
    const source = await readSource(route.path);
    assert.match(source, /searchParams:\s*Promise/);
    assert.match(source, /await searchParams/);
    assert.match(source, route.serviceCall);
    assert.doesNotMatch(source, /"use client"|useEffect|fetch\(/);
  }
});

test("Admin query pages remain server-rendered and client filter islands do not fetch results", async () => {
  const serverPages = await Promise.all([
    readSource("src/app/(admin)/admin/users/page.tsx"),
    readSource("src/app/(admin)/admin/events/page.tsx"),
    readSource("src/app/(admin)/admin/announcements/page.tsx"),
  ]);
  const clientFilterIslands = await Promise.all([
    readSource("src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx"),
    readSource("src/components/(admin)/admin/memberships/MembershipFilterBar.tsx"),
    readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx"),
  ]);

  for (const page of serverPages) {
    assert.match(page, /searchParams:\s*Promise/);
    assert.doesNotMatch(page, /"use client"|useEffect|fetch\(/);
  }
  for (const island of clientFilterIslands) {
    assert.doesNotMatch(island, /fetch\(|@\/repositories/);
  }
});

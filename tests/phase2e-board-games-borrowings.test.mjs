import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("board-game discovery uses URL-authoritative search, filters, and sorting", async () => {
  const [page, toolbar, filters, card] = await Promise.all([
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource("src/components/(public)/board-games/BoardGameFilterDisclosure.tsx"),
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
  ]);
  const queryControls = toolbar + filters;

  assert.match(page, /sort\?: string/);
  assert.match(page, /normalizeSortOption\(/);
  assert.match(toolbar, /<form method="GET" action=\{BASE_PATH\}/);
  assert.match(toolbar, /name="page" value="1"/);
  assert.match(toolbar, /name="search"/);
  assert.match(queryControls, /name="status"/);
  assert.match(toolbar, /name="sort"/);
  assert.match(queryControls, /Search|ListFilter|ArrowUpDown/);
  assert.doesNotMatch(queryControls, /useRouter|usePathname|router\.replace|fetch\(/);
  assert.match(card, /border-\(--border-default\)/);
  assert.match(card, /bg-\(--surface-default\)/);
  assert.doesNotMatch(card, /className="card interactive/);
  assert.match(card, /relative aspect-square/);
  assert.doesNotMatch(card, /aspect-square[^"\n]*\bp-[23]\b/);
});

test("board-game detail explains borrowability before exposing a borrowing action", async () => {
  const [detail, service] = await Promise.all([
    readSource("src/app/(public)/board-games/[id]/page.tsx"),
    readSource("src/services/board-games/board-games.service.ts"),
  ]);

  assert.match(detail, /getOpenBorrowingForUserAndBoardGame/);
  assert.match(detail, /目前無法借用|登入後可申請借用|完成入社後可申請借用/);
  assert.match(detail, /BorrowBoardGameForm/);
  assert.match(detail, /status !== "available"/);
  assert.match(service, /getOpenBorrowingForUserAndBoardGame/);
});

test("borrowings remain server-rendered, queryable, and time-aware", async () => {
  const [page, results, record, service] = await Promise.all([
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/borrowings/BorrowingsResults.tsx"),
    readSource("src/components/(authenticated)/borrowings/BorrowingRecord.tsx"),
    readSource("src/services/board-games/board-games.service.ts"),
  ]);

  assert.doesNotMatch(page, /"use client"|useRouter/);
  assert.match(page, /name="search"/);
  assert.match(page, /name="status"/);
  assert.match(page, /name="sort"/);
  assert.match(results, /getBorrowingsByUserId/);
  assert.match(record, /getDueTimePresentation/);
  assert.match(record, /CalendarClock|TriangleAlert/);
  assert.match(results, /<ul className="flex flex-col gap-2\.5">/);
  assert.match(results, /<li key=\{borrowing\.id\}>/);
  assert.match(page, /container max-w-3xl space-y-6/);
  assert.match(record, /<Card className="p-3 md:p-4">/);
  assert.match(record, /className="size-12 shrink-0 rounded-lg/);
  assert.match(record, /className="flex min-w-0 items-start gap-2\.5"/);
  assert.doesNotMatch(record, /aspect-\[4\/3\] w-full/);
  assert.match(record, /line-clamp-2 text-sm font-semibold leading-snug[\s\S]*?md:text-base/);
  assert.match(record, /title=\{borrowing\.board_game\.name\}/);
  assert.doesNotMatch(record, /md:grid-cols/);
  assert.match(service, /findIdsBySearch\(search\)/);
  assert.match(service, /board_game_ids: matchingBoardGameIds/);
});

test("borrowing records use state-aware compact metadata without a membership gate", async () => {
  const [record, action, page] = await Promise.all([
    readSource("src/components/(authenticated)/borrowings/BorrowingRecord.tsx"),
    readSource("src/components/(authenticated)/borrowings/CancelBorrowingAction.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
  ]);

  assert.match(record, /borrowing\.status === "pending"[\s\S]*?<CancelBorrowingAction/);
  assert.match(record, /borrowing\.status === "borrowed"[\s\S]*?due\.relative/);
  assert.match(record, /borrowing\.status === "returned"[\s\S]*?returned_at/);
  assert.match(record, /borrowing\.status === "cancelled"[\s\S]*?created_at/);
  assert.doesNotMatch(record, /membershipService|currentMembership/);
  assert.match(record, /<div className="min-w-0 flex-1">[\s\S]*?<h2[\s\S]*?<BorrowingStatusBadge/);
  assert.match(record, /className="shrink-0 self-start"/);
  assert.match(action, /variant="danger"/);
  assert.match(page, /lg:grid-cols-\[minmax\(0,1fr\)_auto_auto_auto\]/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("board-game discovery uses URL-authoritative search, filters, and sorting", async () => {
  const [page, toolbar, card] = await Promise.all([
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
  ]);

  assert.match(page, /sort\?: string/);
  assert.match(page, /normalizeSortOption\(/);
  assert.match(toolbar, /<form method="GET" action=\{BASE_PATH\}/);
  assert.match(toolbar, /name="page" value="1"/);
  assert.match(toolbar, /name="search"/);
  assert.match(toolbar, /name="status"/);
  assert.match(toolbar, /name="sort"/);
  assert.match(toolbar, /Search|ListFilter|ArrowUpDown/);
  assert.doesNotMatch(toolbar, /useRouter|usePathname|router\.replace/);
  assert.match(card, /className="card interactive/);
  assert.doesNotMatch(card, /bg-\(--surface-subtle\).*p-3/);
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
  const [page, record, service] = await Promise.all([
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/borrowings/BorrowingRecord.tsx"),
    readSource("src/services/board-games/board-games.service.ts"),
  ]);

  assert.doesNotMatch(page, /"use client"|useRouter/);
  assert.match(page, /name="search"/);
  assert.match(page, /name="status"/);
  assert.match(page, /name="sort"/);
  assert.match(page, /getBorrowingsByUserId/);
  assert.match(record, /getDueTimePresentation/);
  assert.match(record, /CalendarClock|TriangleAlert/);
  assert.match(record, /<Card className="p-4 sm:p-5">/);
  assert.match(service, /findIdsBySearch\(search\)/);
  assert.match(service, /board_game_ids: matchingBoardGameIds/);
});

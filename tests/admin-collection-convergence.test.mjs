import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("board-game categories and locations use the shared admin table structure", async () => {
  const sources = await Promise.all([
    read("src/components/(admin)/admin/board-games/categories/CategoryRecords.tsx"),
    read("src/components/(admin)/admin/board-games/locations/LocationRecords.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /AdminListSection/);
    assert.match(source, /TableHeader/);
    assert.match(source, /TableHead/);
    assert.match(source, /TableRow/);
    assert.match(source, /TableCell/);
    assert.doesNotMatch(source, /<table|<thead|<tbody|<th\b|<td\b/);
    assert.match(source, /md:hidden/);
    assert.match(source, /hidden md:block/);
  }
});

test("admin entity links own their admin destinations and focus treatment", async () => {
  const [boardGameLink, userLink] = await Promise.all([
    read("src/components/(admin)/admin/AdminBoardGameLink.tsx"),
    read("src/components/(admin)/admin/users/AdminUserLink.tsx"),
  ]);

  assert.match(boardGameLink, /`\/admin\/board-games\/\$\{boardGameId\}\/edit`/);
  assert.doesNotMatch(boardGameLink, /`\/board-games\/\$\{boardGameId\}`/);
  assert.match(userLink, /`\/admin\/users\/\$\{userId\}`/);
  assert.match(boardGameLink, /focus-visible:outline/);
  assert.match(userLink, /focus-visible:outline/);
});

test("admin cross-domain references use admin entity links", async () => {
  const [reviews, borrowings, memberships, officers] = await Promise.all([
    read("src/components/(admin)/admin/reviews/AdminReviewRecords.tsx"),
    read("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx"),
    read("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
    read("src/components/(admin)/admin/officers/OfficerRecords.tsx"),
  ]);

  assert.match(reviews, /AdminBoardGameLink/);
  assert.match(reviews, /AdminUserLink/);
  assert.doesNotMatch(reviews, /href=\{`\/board-games\//);
  assert.match(borrowings, /AdminBoardGameLink/);
  assert.match(borrowings, /AdminUserLink/);
  assert.doesNotMatch(borrowings, /buildBoardGameDetailHref/);
  assert.match(memberships, /AdminUserLink/);
  assert.match(officers, /AdminUserLink/);
});

test("Board Game ownership keeps management navigation primary and exposes public preview only on edit", async () => {
  const [collection, editPage, reviews, borrowings] = await Promise.all([
    read("src/components/(admin)/admin/board-games/BoardGameTable.tsx"),
    read("src/app/(admin)/admin/board-games/[id]/edit/page.tsx"),
    read("src/components/(admin)/admin/reviews/AdminReviewRecords.tsx"),
    read("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx"),
  ]);

  assert.match(collection, /AdminBoardGameLink/);
  assert.doesNotMatch(collection, /href=\{`\/board-games\//);
  assert.match(editPage, /href=\{`\/board-games\/\$\{boardGame\.id\}`\}/);
  assert.match(editPage, /查看公開頁面/);
  assert.match(editPage, /variant="text"/);
  assert.match(reviews, /AdminBoardGameLink/);
  assert.doesNotMatch(reviews, /href=\{`\/board-games\//);
  assert.match(borrowings, /AdminBoardGameLink/);
  assert.doesNotMatch(borrowings, /buildBoardGameDetailHref/);
});

test("desktop admin tables share AdminListSection while retaining responsive cards", async () => {
  const paths = [
    "src/components/(admin)/admin/board-games/BoardGameTable.tsx",
    "src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx",
    "src/components/(admin)/admin/reviews/AdminReviewRecords.tsx",
    "src/components/(admin)/admin/memberships/MembershipRecords.tsx",
    "src/components/(admin)/admin/memberships/RegisterKeyTable.tsx",
    "src/components/(admin)/admin/officers/OfficerRecords.tsx",
    "src/components/(admin)/admin/events/EventRecords.tsx",
    "src/components/(admin)/admin/events/AttendanceRecords.tsx",
  ];

  for (const path of paths) {
    const source = await read(path);
    assert.match(source, /AdminListSection/);
    assert.match(source, /(?:xl|lg):hidden/);
    assert.match(source, /hidden (?:xl|lg):block/);
  }
});

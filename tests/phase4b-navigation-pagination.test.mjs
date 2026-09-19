import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

const UUID = "11111111-1111-4111-8111-111111111111";

test("contextual Board Game returns normalize each real source family", () => {
  const { normalizeBoardGameReturnTo } = load(
    "src/libs/board-game-return.ts",
  );

  assert.equal(normalizeBoardGameReturnTo("/"), "/");
  assert.equal(normalizeBoardGameReturnTo("/dashboard"), "/dashboard");
  assert.equal(
    normalizeBoardGameReturnTo(
      `/board-games?page=8&pageSize=24&search=party&sort=rating%3Adesc&status=available&category=${UUID}`,
    ),
    `/board-games?page=8&pageSize=24&search=party&sort=rating%3Adesc&status=available&category=${UUID}`,
  );
  assert.equal(
    normalizeBoardGameReturnTo(
      "/borrowings?page=3&pageSize=20&search=castle&status=borrowed&sort=due_at%3Aasc",
    ),
    "/borrowings?page=3&pageSize=20&search=castle&status=borrowed&sort=due_at%3Aasc",
  );
  assert.equal(
    normalizeBoardGameReturnTo(
      "/profile?reviewPage=2&reviewSearch=party&reviewRating=5&reviewSort=highest",
    ),
    "/profile?reviewPage=2&reviewSearch=party&reviewRating=5&reviewSort=highest",
  );
  assert.equal(
    normalizeBoardGameReturnTo(
      `/profile/${UUID}?reviewPage=2&reviewSort=oldest`,
    ),
    `/profile/${UUID}?reviewPage=2&reviewSort=oldest`,
  );
  assert.equal(
    normalizeBoardGameReturnTo(
      `/admin/board-games/borrowings?page=2&pageSize=20&status=pending&user_id=${UUID}&orderBy=created_at&orderDirection=desc`,
    ),
    `/admin/board-games/borrowings?page=2&pageSize=20&status=pending&user_id=${UUID}&orderBy=created_at&orderDirection=desc`,
  );
});

test("contextual Board Game returns fail closed", () => {
  const { normalizeBoardGameReturnTo } = load(
    "src/libs/board-game-return.ts",
  );
  const rejected = [
    undefined,
    "https://example.com/board-games",
    "//example.com/board-games",
    "https://user:pass@local.invalid/board-games",
    "/login",
    "/register",
    "/verify-email/pending",
    "/api/health",
    "/settings",
    `/board-games/${UUID}`,
    "/profile/not-a-uuid",
    "/dashboard/anything",
    "/board-games?unknown=1",
    "/borrowings?unknown=1",
    "/profile?returnTo=%2F",
    "/#fragment",
    "/dashboard\u0000",
  ];
  for (const value of rejected) {
    assert.equal(normalizeBoardGameReturnTo(value), "/board-games");
  }
});

test("pagination summary models zero, single and multi-page datasets", () => {
  const { getPaginationSummary } = load(
    "src/components/Pagination/PaginationSummary.tsx",
  );

  assert.equal(getPaginationSummary({ page: 1, pageSize: 24, total: 0, totalPages: 0 }), null);
  assert.deepEqual(
    getPaginationSummary({ page: 1, pageSize: 24, total: 18, totalPages: 1 }),
    { start: 1, end: 18, total: 18, page: 1, totalPages: 1, paginated: false },
  );
  assert.deepEqual(
    getPaginationSummary({ page: 1, pageSize: 24, total: 607, totalPages: 26 }),
    { start: 1, end: 24, total: 607, page: 1, totalPages: 26, paginated: true },
  );
  assert.deepEqual(
    getPaginationSummary({ page: 8, pageSize: 24, total: 607, totalPages: 26 }),
    { start: 169, end: 192, total: 607, page: 8, totalPages: 26, paginated: true },
  );
  assert.deepEqual(
    getPaginationSummary({ page: 26, pageSize: 24, total: 607, totalPages: 26 }),
    { start: 601, end: 607, total: 607, page: 26, totalPages: 26, paginated: true },
  );
});

test("real Board Game entry points explicitly propagate contextual return URLs", async () => {
  const paths = [
    "src/app/(public)/board-games/page.tsx",
    "src/components/(public)/home/HomeBoardGamePreview.tsx",
    "src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx",
    "src/components/(authenticated)/borrowings/BorrowingRecord.tsx",
    "src/components/(public)/profile/ProfileReviews.tsx",
    "src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx",
  ];
  const sources = await Promise.all(paths.map(source));
  for (const content of sources) assert.match(content, /returnTo|buildBoardGameDetailHref/);
});

test("detail review navigation preserves contextual return separately", async () => {
  const [page, reviews] = await Promise.all([
    source("src/app/(public)/board-games/[id]/page.tsx"),
    source("src/components/(public)/board-games/BoardGameReviews.tsx"),
  ]);
  assert.match(page, /normalizeBoardGameReturnTo/);
  assert.match(page, />\s*返回\s*</);
  assert.match(reviews, /preservedQuery = \{ returnTo \}/);
  assert.doesNotMatch(reviews, /returnTo:\s*review/);
});

test("selected long-list pages add orientation without duplicating top navigation", async () => {
  const paths = [
    "src/app/(public)/board-games/page.tsx",
    "src/app/(admin)/admin/users/page.tsx",
    "src/app/(admin)/admin/board-games/page.tsx",
    "src/app/(admin)/admin/memberships/page.tsx",
    "src/app/(admin)/admin/officers/page.tsx",
    "src/app/(admin)/admin/board-games/borrowings/page.tsx",
    "src/app/(admin)/admin/events/page.tsx",
  ];
  for (const path of paths) {
    const content = await source(path);
    assert.equal((content.match(/<PaginationSummary\b/g) ?? []).length, 1, path);
    assert.equal((content.match(/<Pagination\b/g) ?? []).length, 1, path);
  }
});

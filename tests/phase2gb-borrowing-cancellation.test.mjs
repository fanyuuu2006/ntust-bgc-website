import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("user cancellation is a preserved pending-to-cancelled transition, not admin deletion", async () => {
  const [migration, fixture, schema, types, repository, service] = await Promise.all([
    readSource("supabase/migrations/202609050001_add_cancelled_borrowing_status.sql"),
    readSource("supabase/verification/202609050001_cancel_borrowing_transactionally.sql"),
    readSource("src/services/board-games/board-games.schema.ts"),
    readSource("src/types/database.tsx"),
    readSource("src/repositories/board-game-borrowings.repository.ts"),
    readSource("src/services/board-games/board-games.service.ts"),
  ]);

  assert.match(migration, /alter type public\.borrowing_status add value if not exists 'cancelled'/);
  assert.match(fixture, /begin;[\s\S]*rollback;/);
  assert.match(fixture, /PENDING_CANCELLATION_MUTATED_BOARD_GAME/);
  assert.match(fixture, /USER_WINS_APPROVAL_SUCCEEDED/);
  assert.match(fixture, /'pending'::public\.borrowing_status, 'approved'::public\.borrowing_status, 'borrowed'::public\.borrowing_status/);
  assert.match(schema, /"cancelled"/);
  assert.match(types, /\| "cancelled"/);
  assert.match(repository, /cancelPendingByIdAndUserId/);
  assert.match(repository, /updateByIdIfCurrentStatus/);
  assert.match(repository, /\.update\(\{ status: "cancelled" \}\)[\s\S]*?\.eq\("id", id\)[\s\S]*?\.eq\("user_id", userId\)[\s\S]*?\.eq\("status", "pending"\)/);
  assert.match(service, /cancelPendingBorrowingByUserId/);
  assert.match(service, /cancelPendingByIdAndUserId\([\s\S]*?borrowingId,[\s\S]*?userId/);
  assert.match(service, /new BorrowingCancellationConflictError\(\)/);
  assert.match(service, /approveBorrowing[\s\S]*?updateByIdIfCurrentStatus\(borrowingId, "pending"/);
  assert.match(service, /rejectBorrowing[\s\S]*?updateByIdIfCurrentStatus\(borrowingId, "pending"/);
  assert.doesNotMatch(service.slice(service.indexOf("cancelPendingBorrowingByUserId"), service.indexOf("approveBorrowing")), /deleteBorrowing|deleteTransactionally|membershipService/);
});

test("the user-only cancellation route owns authentication and maps ownership and stale-state errors", async () => {
  const route = await readSource("src/app/api/users/me/borrowings/[id]/cancel/route.ts");

  assert.match(route, /export async function POST/);
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /cancelPendingBorrowingByUserId\([\s\S]*?user\.id/);
  assert.match(route, /BorrowingNotFoundError[\s\S]*?status: 404/);
  assert.match(route, /BorrowingCancellationConflictError[\s\S]*?status: 409/);
  assert.doesNotMatch(route, /isAdminByUserId|deleteBorrowing/);
});

test("borrowing history, filters, dashboard, and admin all understand cancelled without invalid workflow actions", async () => {
  const [record, action, page, badge, admin, dashboardService] = await Promise.all([
    readSource("src/components/(authenticated)/borrowings/BorrowingRecord.tsx"),
    readSource("src/components/(authenticated)/borrowings/CancelBorrowingAction.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/BorrowingStatusBadge.tsx"),
    readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx"),
    readSource("src/services/board-games/board-games.service.ts"),
  ]);

  assert.match(record, /borrowing\.status === "pending"[\s\S]*?<CancelBorrowingAction/);
  assert.match(record, /borrowing\.status === "cancelled"/);
  assert.match(action, /取消申請/);
  assert.match(action, /取消借用申請/);
  assert.match(action, /ConfirmDialog/);
  assert.match(action, /router\.refresh\(\)/);
  assert.match(action, /caught instanceof ApiError && caught\.status === 409/);
  assert.match(page, /value: "cancelled"/);
  assert.match(badge, /cancelled: "已取消"/);
  assert.match(badge, /cancelled: "neutral"/);
  assert.match(admin, /option value="cancelled"/);
  assert.match(admin, /borrowing\.status === "cancelled"/);
  assert.match(admin, /if \(borrowing\.status === "cancelled"\) return null/);
  assert.match(dashboardService, /status: "borrowed"[\s\S]*?status: "approved"[\s\S]*?status: "pending"/);
  assert.doesNotMatch(dashboardService.slice(dashboardService.indexOf("getDashboardOpenBorrowingsByUserId"), dashboardService.indexOf("getBorrowingById")), /"cancelled"/);
});

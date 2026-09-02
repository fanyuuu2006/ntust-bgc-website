import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin borrowing edit only changes a borrowed due date while workflow state stays dedicated", async () => {
  const [schema, service, repository, route, list] = await Promise.all([
    readSource("src/services/board-games/board-games.schema.ts"),
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/repositories/board-game-borrowings.repository.ts"),
    readSource("src/app/api/admin/borrowings/[id]/route.ts"),
    readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx"),
  ]);

  assert.match(schema, /updateBorrowingDueDateSchema/);
  assert.match(service, /updateBorrowingDueDate/);
  assert.match(repository, /updateDueAtIfBorrowed/);
  assert.match(route, /updateBorrowingDueDateSchema/);
  assert.match(list, /action === "edit"/);
  assert.match(list, /編輯借用紀錄/);
  const dueDateSchema = schema.slice(schema.indexOf("updateBorrowingDueDateSchema"));
  assert.doesNotMatch(dueDateSchema, /status/);
});

test("admin borrowing deletion uses a hardened transaction for the borrowed asset state", async () => {
  const [migration, verification, repository, service, route, list] = await Promise.all([
    readSource("supabase/migrations/202609020002_delete_board_game_borrowing_transactionally.sql"),
    readSource("supabase/verification/202609020002_delete_board_game_borrowing_transactionally.sql"),
    readSource("src/repositories/board-game-borrowings.repository.ts"),
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/app/api/admin/borrowings/[id]/route.ts"),
    readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx"),
  ]);

  assert.match(migration, /create function public\.delete_board_game_borrowing/);
  assert.match(migration, /for update/);
  assert.match(migration, /BOARD_GAME_STATUS_CONFLICT/);
  assert.match(migration, /update public\.board_games[\s\S]*status = 'available'/);
  assert.match(migration, /revoke all privileges on function public\.delete_board_game_borrowing/);
  assert.match(migration, /grant execute on function public\.delete_board_game_borrowing\(bigint\) to service_role/);
  assert.match(verification, /begin;/);
  assert.match(verification, /rollback;/);
  assert.match(verification, /BOARD_GAME_STATUS_CONFLICT/);
  assert.match(verification, /'approved'::public\.borrowing_status/);
  assert.match(verification, /'rejected'::public\.borrowing_status/);
  assert.match(verification, /'returned'::public\.borrowing_status/);
  assert.match(repository, /rpc\("delete_board_game_borrowing"/);
  assert.match(service, /deleteBorrowing/);
  assert.match(route, /export async function DELETE/);
  assert.match(list, /刪除借用紀錄/);
  assert.match(list, /variant="danger"/);
});

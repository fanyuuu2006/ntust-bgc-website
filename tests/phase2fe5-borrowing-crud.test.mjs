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

test("mobile borrowing cards keep lifecycle metadata state-aware and compact", async () => {
  const list = await readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx");

  assert.match(list, /<MobileBorrowingMetadata borrowing=\{borrowing\} \/>/);
  assert.match(list, /function MobileBorrowingMetadata/);
  assert.match(list, /grid-cols-2/);
  assert.match(list, /if \(borrowing\.status === "rejected"\)/);
  assert.match(list, /label="拒絕人"/);
  assert.match(list, /if \(borrowing\.status === "borrowed"\)/);
  assert.match(list, /label="預計歸還"/);
  assert.match(list, /if \(borrowing\.status === "pending"\)/);
});

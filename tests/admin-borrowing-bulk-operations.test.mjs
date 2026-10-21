import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";

import { ZodError } from "zod";
import { load } from "./helpers/load-app-module.mjs";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const pending = {
  id: 101,
  expected_status: "pending",
  expected_board_game_id: "11111111-1111-4111-8111-111111111111",
  expected_board_game_status: "available",
};
const borrowed = { ...pending, expected_status: "borrowed", expected_board_game_status: "borrowed" };
const approved = { ...pending, expected_status: "approved" };

const borrowingRows = [
  makeBorrowing(101, "pending", "available", "待審桌遊"),
  makeBorrowing(102, "pending", "available", "另一款桌遊"),
  makeBorrowing(103, "approved", "available", "已核准桌遊"),
  makeBorrowing(104, "borrowed", "borrowed", "借出桌遊"),
  makeBorrowing(105, "returned", "available", "已歸還桌遊"),
];

function makeBorrowing(id, status, gameStatus, name) {
  return {
    id,
    board_game_id: `11111111-1111-4111-8111-${String(id).padStart(12, "0")}`,
    user_id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-10-20T00:00:00.000Z",
    approved_at: null, rejected_at: null, cancelled_at: null,
    borrowed_at: status === "borrowed" || status === "returned" ? "2026-10-20T01:00:00.000Z" : null,
    due_at: status === "borrowed" ? "2026-10-27T01:00:00.000Z" : null,
    returned_at: status === "returned" ? "2026-10-21T01:00:00.000Z" : null,
    status,
    approved_by_user_id: null,
    board_game: { id: `11111111-1111-4111-8111-${String(id).padStart(12, "0")}`, name, inventory_number: id, status: gameStatus },
    user: { id: "22222222-2222-4222-8222-222222222222", name: `測試社員 ${id}`, email: "member@example.test" },
    user_profile: null, approved_by_user: null, approved_by_user_profile: null,
    is_current_academic_year_member: true,
  };
}

async function withBorrowingList(run) {
  const dom = new JSDOM('<div id="app"></div>', { url: "https://example.test" });
  const previous = { window: globalThis.window, self: globalThis.self, document: globalThis.document, HTMLElement: globalThis.HTMLElement, fetch: globalThis.fetch, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, self: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, options }); return new Response(JSON.stringify({ data: { updatedCount: 2 } }), { status: 200, headers: { "Content-Type": "application/json" } }); };
  const { createRoot } = await import("react-dom/client");
  const host = document.getElementById("app");
  const root = createRoot(host);
  const { AdminBorrowingList } = load("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx", {
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "@/components/Modal": { Modal: ({ open, title, onClose, children }) => open ? createElement("section", { "aria-label": title }, createElement("button", { type: "button", onClick: onClose }, "關閉對話框"), children) : null },
    "@/components/ConfirmDialog": { ConfirmDialog: ({ open, title, onConfirm }) => open ? createElement("section", { "aria-label": title }, createElement("button", { type: "button", onClick: onConfirm }, "確認送出")) : null },
  });
  try { await run({ host, root, requests, AdminBorrowingList }); }
  finally { await act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close(); }
}

test("borrowing bulk schema accepts only valid, bounded, status-compatible batches", () => {
  const { bulkUpdateBorrowingsSchema } = load("src/services/board-games/board-games.schema.ts");
  for (const input of [
    { action: "approve", records: [pending] },
    { action: "reject", records: [pending] },
    { action: "borrow", due_at: "2099-10-27T01:00:00.000Z", records: [approved] },
    { action: "return", records: [borrowed] },
  ]) assert.equal(bulkUpdateBorrowingsSchema.safeParse(input).success, true);

  for (const input of [
    { action: "approve", records: [] },
    { action: "approve", records: [pending, pending] },
    { action: "approve", records: [borrowed] },
    { action: "return", records: [pending] },
    { action: "return", records: [{ ...borrowed, expected_board_game_status: "available" }] },
    { action: "borrow", records: [approved] },
    { action: "borrow", due_at: "not-a-date", records: [approved] },
    { action: "borrow", due_at: "2020-01-01T00:00:00.000Z", records: [approved] },
    { action: "borrow", due_at: "2099-10-27T01:00:00.000Z", records: [pending] },
    { action: "borrow", due_at: "2099-10-27T01:00:00.000Z", records: [{ ...approved, expected_board_game_status: "borrowed" }] },
    { action: "checkout", records: [pending] },
    { action: "approve", records: Array.from({ length: 101 }, (_, index) => ({ ...pending, id: index + 1 })) },
  ]) assert.equal(bulkUpdateBorrowingsSchema.safeParse(input).success, false);
});

test("borrowing batch route preserves authorization, validation, conflict, and success contracts", async () => {
  const { BorrowingBatchConflictError, BorrowingDueDateError } = load("src/services/board-games/board-games.errors.tsx");
  let authorization = { user: { id: "admin-1" }, response: null };
  let serviceError = null;
  const calls = [];
  const { PATCH } = load("src/app/api/admin/borrowings/batch/route.ts", {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => authorization },
    "@/libs/api/server-response": { unexpectedErrorResponse: (_context, _error, message) => ({ body: { message }, status: 500 }) },
    "@/services/board-games/board-games.errors": { BorrowingBatchConflictError, BorrowingDueDateError },
    "@/services/board-games/board-games.service": { boardGamesService: { bulkUpdateBorrowingsForAdmin: async (...args) => { calls.push(args); if (serviceError) throw serviceError; return { updatedCount: 1 }; } } },
  });
  const input = { action: "approve", records: [pending] };
  const request = { json: async () => input };
  for (const response of [{ status: 401 }, { status: 403 }]) {
    authorization = { user: null, response };
    assert.equal(await PATCH(request), response);
  }
  authorization = { user: { id: "admin-1" }, response: null };
  assert.deepEqual(await PATCH(request), { body: { data: { updatedCount: 1 } }, status: 200 });
  assert.deepEqual(calls.at(-1), ["admin-1", input]);
  serviceError = new ZodError([]);
  assert.equal((await PATCH(request)).status, 400);
  serviceError = new BorrowingBatchConflictError();
  assert.equal((await PATCH(request)).status, 409);
  serviceError = new BorrowingDueDateError();
  assert.equal((await PATCH(request)).status, 409);
});

test("borrowing bulk RPC is atomic, stale-safe, deterministic, and server-only", async () => {
  const [migration, canonical, verification] = await Promise.all([
    readSource("supabase/migrations/202610210001_add_admin_borrowing_bulk_actions.sql"),
    readSource("supabase/schema/canonical-public-schema.sql"),
    readSource("supabase/verification/verify-reproducible-schema.sql"),
  ]);
  assert.match(migration, /jsonb_array_length\(p_records\)/);
  assert.match(migration, /p_due_at timestamptz/);
  assert.match(migration, /v_expected_count > 100/);
  assert.match(migration, /count\(distinct input\.id\)/);
  assert.match(migration, /order by borrowing\.id\s+for update of borrowing/s);
  assert.match(migration, /order by game\.id\s+for update of game/s);
  assert.match(migration, /status is distinct from v_record\.expected_status/);
  assert.match(migration, /board_game_id is distinct from v_record\.expected_board_game_id/);
  assert.match(migration, /set status = 'returned'[\s\S]*set status = 'available'/);
  assert.match(migration, /p_due_at <= clock_timestamp\(\)/);
  assert.match(migration, /p_action = 'borrow'[\s\S]*set status = 'borrowed'[\s\S]*set status = 'borrowed'/);
  assert.match(migration, /raise exception[\s\S]*BULK_UPDATE_COUNT_MISMATCH/);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/);
  assert.match(migration, /from public, anon, authenticated, service_role/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(canonical, /create function public\.manage_admin_board_game_borrowings/);
  assert.match(verification, /manage_admin_board_game_borrowings/);
});

test("borrowing UI shares current-page selection and preserves single-record actions", async () => {
  const source = await readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx");
  assert.match(source, /useCurrentPageSelection/);
  assert.match(source, /eligibleBorrowings\.map/);
  assert.match(source, /indeterminate=\{partiallySelected\}/);
  assert.match(source, /mobileBulkMode/);
  assert.match(source, /!mobileBulkMode \?/);
  assert.match(source, /\/api\/admin\/borrowings\/batch/);
  assert.match(source, /expected_board_game_status: borrowing\.board_game\.status/);
  assert.match(source, /<BorrowingActions/);
  assert.match(source, /<BorrowingActionDialog/);
});

test("single borrowing action dialog shows the complete record without batch copy", async () => {
  await withBorrowingList(async ({ host, root, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    const approve = [...host.querySelectorAll("button")].find((button) => button.textContent === "核准借用");
    await act(async () => approve.click());
    const dialog = host.querySelector('section[aria-label="核准借用"]');
    assert.ok(dialog);
    assert.match(dialog.textContent, /待審桌遊/);
    assert.match(dialog.textContent, /#101 · 借用人：測試社員 101/);
    assert.equal(dialog.textContent.match(/待審核/g)?.length, 1);
    assert.doesNotMatch(dialog.textContent, /目前狀態/);
    assert.doesNotMatch(dialog.textContent, /共 1 筆|批次/);
  });
});

test("batch dialog uses compact rows and one central scroll region", async () => {
  await withBorrowingList(async ({ host, root, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    for (const name of ["待審桌遊", "另一款桌遊"]) {
      await act(async () => host.querySelector(`input[aria-label="選取 ${name} 的借用紀錄"]`).click());
    }
    await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent === "批次核准").click());
    const dialog = host.querySelector('section[aria-label="批次核准"]');
    const details = dialog.querySelector('[aria-label="借用紀錄明細"]');
    assert.equal(details.querySelectorAll("li").length, 2);
    assert.doesNotMatch(details.className, /max-h-|overflow-y-auto|surface-subtle/);
    assert.match(details.className, /divide-y/);
    assert.equal(dialog.querySelectorAll(".overflow-y-auto").length, 1);
    assert.match(dialog.textContent, /共 2 筆/);
    assert.match(dialog.textContent, /待審桌遊/);
    assert.match(dialog.textContent, /另一款桌遊/);
  });
});

test("large batch keeps every detail row inside the single scrollable dialog body", async () => {
  await withBorrowingList(async ({ host, root, AdminBorrowingList }) => {
    const manyBorrowings = Array.from({ length: 24 }, (_, index) =>
      makeBorrowing(200 + index, "pending", "available", `批次桌遊 ${index + 1}`),
    );
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: manyBorrowings, hasQuery: false })));
    const selectAll = host.querySelector('input[aria-label="選取目前頁面所有可批次操作的借用紀錄"]');
    await act(async () => selectAll.click());
    await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent === "批次核准").click());
    const dialog = host.querySelector('section[aria-label="批次核准"]');
    assert.equal(dialog.querySelectorAll('[aria-label="借用紀錄明細"] li').length, 24);
    assert.match(dialog.textContent, /共 24 筆/);
    assert.equal(dialog.querySelectorAll(".overflow-y-auto").length, 1);
  });
});

test("dialog close and reopen restores the correct action content", async () => {
  await withBorrowingList(async ({ host, root, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    const reject = [...host.querySelectorAll("button")].find((button) => button.textContent === "拒絕申請");
    await act(async () => reject.click());
    let dialog = host.querySelector('section[aria-label="拒絕申請"]');
    assert.ok(dialog);
    await act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent === "關閉對話框").click());
    assert.equal(host.querySelector('section[aria-label="拒絕申請"]'), null);
    await act(async () => reject.click());
    dialog = host.querySelector('section[aria-label="拒絕申請"]');
    assert.match(dialog.textContent, /確認拒絕/);
  });
});

test("single lifecycle actions keep distinct titles, impact copy, and confirm labels", async () => {
  await withBorrowingList(async ({ host, root, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    for (const expectation of [
      { trigger: "核准借用", title: "核准借用", confirm: "確認核准", impact: "仍需由管理員確認借出" },
      { trigger: "拒絕申請", title: "拒絕申請", confirm: "確認拒絕", impact: "無法繼續借出" },
      { trigger: "確認借出", title: "確認借出", confirm: "確認借出", impact: "關聯桌遊都會標記為借出中" },
      { trigger: "確認歸還", title: "確認歸還", confirm: "確認歸還", impact: "恢復為可借用" },
    ]) {
      const trigger = [...host.querySelectorAll("button")].find((button) => button.textContent === expectation.trigger);
      await act(async () => trigger.click());
      const dialog = host.querySelector(`section[aria-label="${expectation.title}"]`);
      assert.ok(dialog);
      assert.ok([...dialog.querySelectorAll("button")].some((button) => button.textContent === expectation.confirm));
      assert.match(dialog.textContent, new RegExp(expectation.impact));
      await act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent === "關閉對話框").click());
    }
  });
});

test("single checkout keeps its existing PATCH payload while using the shared dialog", async () => {
  await withBorrowingList(async ({ host, root, requests, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    const checkout = [...host.querySelectorAll("button")].find((button) => button.textContent === "確認借出");
    await act(async () => checkout.click());
    const dialog = host.querySelector('section[aria-label="確認借出"]');
    await act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent === "確認借出").click());
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/api/admin/borrowings/103");
    const body = JSON.parse(requests[0].options.body);
    assert.equal(body.action, "checkout");
    assert.ok(new Date(body.due_at) > new Date());
  });
});

test("borrowing production component exposes eligible current-page selection and indeterminate state", async () => {
  await withBorrowingList(async ({ host, root, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    const row = host.querySelector('input[aria-label="選取 待審桌遊 的借用紀錄"]');
    const selectAll = host.querySelector('input[aria-label="選取目前頁面所有可批次操作的借用紀錄"]');
    await act(async () => row.click());
    assert.equal(selectAll.indeterminate, true);
    assert.ok([...host.querySelectorAll("button")].some((button) => button.textContent === "批次核准"));
    assert.equal(host.querySelector('input[aria-label="選取 已歸還桌遊 的借用紀錄"]').disabled, true);
    assert.equal(host.querySelector('input[aria-label="選取 已核准桌遊 的借用紀錄"]').disabled, false);
  });
});

test("borrowing production component confirms once and submits only selected stale-state records", async () => {
  await withBorrowingList(async ({ host, root, requests, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    for (const name of ["待審桌遊", "另一款桌遊"]) await act(async () => host.querySelector(`input[aria-label="選取 ${name} 的借用紀錄"]`).click());
    const approve = [...host.querySelectorAll("button")].find((button) => button.textContent === "批次核准");
    await act(async () => approve.click());
    assert.ok(host.querySelector('section[aria-label="批次核准"]'));
    const dialog = host.querySelector('section[aria-label="批次核准"]');
    await act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent.includes("確認核准")).click());
    assert.equal(requests.length, 1);
    const body = JSON.parse(requests[0].options.body);
    assert.deepEqual(body.records.map((record) => record.id), [101, 102]);
    assert.ok(body.records.every((record) => record.expected_status === "pending" && record.expected_board_game_status === "available"));
  });
});

test("approved borrowing opens the shared due-date flow and submits one atomic borrow request", async () => {
  await withBorrowingList(async ({ host, root, requests, AdminBorrowingList }) => {
    await act(async () => root.render(createElement(AdminBorrowingList, { borrowings: borrowingRows, hasQuery: false })));
    await act(async () => host.querySelector('input[aria-label="選取 已核准桌遊 的借用紀錄"]').click());
    const borrow = [...host.querySelectorAll("button")].find((button) => button.textContent === "批次確認借出");
    await act(async () => borrow.click());
    const dialog = host.querySelector('section[aria-label="批次確認借出"]');
    assert.ok(dialog);
    assert.match(dialog.querySelector('input[type="datetime-local"]').value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    await act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent.includes("確認借出")).click());
    assert.equal(requests.length, 1);
    const body = JSON.parse(requests[0].options.body);
    assert.equal(body.action, "borrow");
    assert.equal(body.records[0].expected_status, "approved");
    assert.equal(body.records[0].expected_board_game_status, "available");
    assert.ok(new Date(body.due_at) > new Date());
  });
});

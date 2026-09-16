import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { JSDOM } from "jsdom";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const game = { id: "00000000-0000-4000-8000-000000000001", name: "測試桌遊", inventory_number: 8, image: null };
const times = {
  created_at: "2026-09-15T01:00:00Z",
  approved_at: "2026-09-15T02:00:00Z",
  borrowed_at: "2026-09-16T03:00:00Z",
  due_at: "2026-09-20T04:00:00Z",
  returned_at: "2026-09-18T05:00:00Z",
  rejected_at: "2026-09-15T02:30:00Z",
  cancelled_at: "2026-09-15T01:30:00Z",
};

test("borrowing lifecycle migration adds nullable facts and explicit atomic transition RPCs", async () => {
  const migration = await read("supabase/migrations/202609160001_add_borrowing_lifecycle_timestamps.sql");
  for (const column of ["approved_at", "rejected_at", "cancelled_at"]) {
    assert.match(migration, new RegExp(`add column ${column} timestamptz`));
  }
  assert.doesNotMatch(migration, /update public\.board_game_borrowings[\s\S]*set (approved_at|rejected_at|cancelled_at)/i);
  assert.doesNotMatch(migration, /create trigger/i);
  assert.match(migration, /create function public\.approve_borrowing/);
  assert.match(migration, /status = 'approved'[\s\S]*approved_at = now\(\)[\s\S]*status = 'pending'/);
  assert.match(migration, /status = 'rejected'[\s\S]*rejected_at = now\(\)[\s\S]*status = 'pending'/);
  assert.match(migration, /status = 'cancelled'[\s\S]*cancelled_at = now\(\)[\s\S]*user_id = p_user_id[\s\S]*status = 'pending'/);
});

test("approve, reject, and cancel repositories use one explicit transition RPC each", async () => {
  const calls = [];
  const { boardGameBorrowingsRepository } = load("src/repositories/board-game-borrowings.repository.ts", {
    "@/libs/supabase/server": { supabase: { rpc: async (name, args) => { calls.push([name, args]); return { data: null, error: null }; } } },
  });
  await boardGameBorrowingsRepository.approve(7, "admin");
  await boardGameBorrowingsRepository.reject(8, "admin");
  await boardGameBorrowingsRepository.cancelPendingByIdAndUserId(9, "owner");
  assert.deepEqual(calls, [
    ["approve_borrowing", { p_borrowing_id: 7, p_approver_user_id: "admin" }],
    ["reject_borrowing", { p_borrowing_id: 8, p_approver_user_id: "admin" }],
    ["cancel_pending_borrowing", { p_borrowing_id: 9, p_user_id: "owner" }],
  ]);
});

test("member borrowing cards render compact authoritative lifecycle facts and omit unavailable facts", () => {
  const { BorrowingRecord } = load("src/components/(authenticated)/borrowings/BorrowingRecord.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => {} }) },
  });
  const render = (status, overrides = {}) => renderToStaticMarkup(createElement(BorrowingRecord, {
    borrowing: { id: "1", status, ...times, board_game: game, ...overrides },
  }));

  assert.match(render("pending"), /等待幹部審核/);
  assert.match(render("approved"), /已核准，等待領取/);
  assert.match(render("approved"), /核准於 2026\/09\/15 10:00/);
  assert.match(render("borrowed"), /歸還期限 · 2026\/09\/20 12:00/);
  assert.match(render("borrowed"), /申請 09\/15 · 核准 09\/15 · 領取 09\/16/);
  assert.match(render("returned"), /2026\/09\/18 13:00 已歸還/);
  assert.match(render("rejected"), /申請未獲核准/);
  assert.match(render("rejected"), /拒絕於 2026\/09\/15 10:30/);
  assert.match(render("cancelled"), /借用申請已取消/);
  assert.match(render("cancelled"), /取消於 2026\/09\/15 09:30/);

  const historical = render("approved", { approved_at: null });
  const historicalText = new JSDOM(historical).window.document.body.textContent;
  assert.doesNotMatch(historicalText, /核准於|未知|N\/A|--/);
  assert.match(historical, /申請 09\/15/);
  assert.match(historical, new RegExp(`href="/board-games/${game.id}"`));
});

test("canonical schema, TypeScript and member projection expose nullable lifecycle timestamps", async () => {
  const [schema, types, repository] = await Promise.all([
    read("supabase/schema/canonical-public-schema.sql"),
    read("src/types/database.tsx"),
    read("src/repositories/board-game-borrowings.repository.ts"),
  ]);
  for (const column of ["approved_at", "rejected_at", "cancelled_at"]) {
    assert.match(schema, new RegExp(`${column} timestamptz`));
    assert.match(types, new RegExp(`${column}: Timestamp \\| null`));
    assert.match(repository, new RegExp(`id,status,created_at[^\"]*${column}`));
  }
});

test("Admin borrowing presentation uses authoritative transition timestamps", () => {
  const { AdminBorrowingList } = load("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx", {
    "next/navigation": { useRouter: () => ({ push: () => {}, refresh: () => {} }) },
  });
  const borrowing = {
    id: "1", status: "approved", ...times, board_game_id: game.id, user_id: "user",
    approved_by_user_id: "admin", board_game: game,
    user: { id: "user", name: "社員", email: "member@example.test" }, user_profile: null,
    approved_by_user: { id: "admin", name: "幹部", email: "admin@example.test" },
    approved_by_user_profile: null, is_current_academic_year_member: true,
  };
  const html = renderToStaticMarkup(createElement(AdminBorrowingList, { borrowings: [borrowing], query: {} }));
  assert.match(html, /核准時間/);
  assert.match(html, /2026\/09\/15 10:00/);
});

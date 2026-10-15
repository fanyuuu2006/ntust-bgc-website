import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { load } from "./helpers/load-app-module.mjs";

const read = (path) => readFile(path, "utf8");
const ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

test("board-game batch input accepts classification commands and rejects unsafe batches", async () => {
  const { bulkUpdateBoardGamesSchema } = load("src/services/board-games/board-games.schema.ts");
  const record = { id: ID, expected_updated_at: "2026-10-15T00:00:00.000Z" };
  assert.equal(bulkUpdateBoardGamesSchema.safeParse({ action: "set-category", target_id: OTHER_ID, records: [record] }).success, true);
  assert.equal(bulkUpdateBoardGamesSchema.safeParse({ action: "set-location", target_id: OTHER_ID, records: [record] }).success, true);
  assert.equal(bulkUpdateBoardGamesSchema.safeParse({ action: "set-status", target_id: OTHER_ID, records: [record] }).success, false);
  assert.equal(bulkUpdateBoardGamesSchema.safeParse({ action: "set-category", target_id: OTHER_ID, records: [] }).success, false);
  assert.equal(bulkUpdateBoardGamesSchema.safeParse({ action: "set-category", target_id: OTHER_ID, records: [record, record] }).success, false);
  assert.equal(bulkUpdateBoardGamesSchema.safeParse({ action: "set-category", target_id: OTHER_ID, records: Array.from({ length: 101 }, (_, index) => ({ ...record, id: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111` })) }).success, false);
});

test("board-game batch API keeps Admin authorization and conflict contracts", async () => {
  const route = await read("src/app/api/admin/board-games/batch/route.ts");
  assert.match(route, /authorizeAdminRequest\("沒有桌遊管理權限"\)/);
  assert.match(route, /bulkUpdateClassificationForAdmin/);
  assert.match(route, /BoardGameBatchConflictError[\s\S]*status: 409/);
  assert.match(route, /ZodError[\s\S]*status: 400/);
  assert.doesNotMatch(route, /actor|user_id/);
});

test("board-game batch repository delegates one atomic RPC with stale-state input", async () => {
  const repository = await read("src/repositories/board-games.repository.ts");
  const service = await read("src/services/board-games/board-games.service.ts");
  assert.match(repository, /rpc\("update_admin_board_games_classification"/);
  assert.match(repository, /expected_updated_at: record\.updated_at/);
  assert.doesNotMatch(repository, /Promise\.all[\s\S]*updateManyClassificationForAdmin/);
  assert.match(service, /getCategoryById\(data\.target_id\)/);
  assert.match(service, /getLocationById\(data\.target_id\)/);
  assert.match(service, /invalidatePublicData\("popularGames"\)/);
});

test("board-game batch RPC locks targets and rows before one all-or-nothing update", async () => {
  const sql = await read("supabase/migrations/202610150003_update_board_games_classification_atomically.sql");
  assert.match(sql, /for key share/i);
  assert.match(sql, /order by game\.id for update of game/i);
  assert.match(sql, /updated_at is distinct from input\.expected_updated_at/i);
  assert.match(sql, /if v_locked_count <> v_item_count/i);
  assert.equal((sql.match(/update public\.board_games/g) ?? []).length, 2);
  assert.match(sql, /revoke all privileges[\s\S]*service_role/);
  assert.match(sql, /grant execute[\s\S]*to service_role/);
});

test("board-game collection exposes shared current-page selection on desktop and mobile", async () => {
  const table = await read("src/components/(admin)/admin/board-games/BoardGameTable.tsx");
  const bulkBar = await read("src/components/(admin)/admin/AdminBulkActionBar.tsx");
  const page = await read("src/app/(admin)/admin/board-games/page.tsx");
  assert.match(page, /categories=\{category\}[\s\S]*locations=\{location\}/);
  assert.ok((table.match(/selectedIds\.has\(game\.id\)/g) ?? []).length >= 2);
  assert.match(table, /aria-label="選取目前頁面的所有桌遊"/);
  assert.match(table, /selectedCount === 0[\s\S]*選取本頁/);
  assert.match(table, /selectedCount=\{selectedCount\}/);
  assert.match(bulkBar, /已選取 \{selectedCount\} 筆/);
  assert.match(table, /set-category/);
  assert.match(table, /set-location/);
  assert.match(table, /<ConfirmDialog[\s\S]*confirmLabel="套用變更"/);
  assert.match(table, /expected_updated_at: game\.updated_at/);
  assert.match(table, /setSelectedIds\(new Set\(\)\)[\s\S]*router\.refresh/);
});

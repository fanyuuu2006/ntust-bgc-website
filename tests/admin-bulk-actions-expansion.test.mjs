import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("existing bulk collections share a compact contextual action bar", async () => {
  const [primitive, boardGames, memberships, keys, attendances, suggestions] = await Promise.all([
    read("src/components/(admin)/admin/AdminBulkActionBar.tsx"),
    read("src/components/(admin)/admin/board-games/BoardGameTable.tsx"),
    read("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
    read("src/components/(admin)/admin/memberships/RegisterKeyTable.tsx"),
    read("src/components/(admin)/admin/events/AttendanceRecords.tsx"),
    read("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionList.tsx"),
  ]);
  assert.match(primitive, /if \(selectedCount === 0\) return null/);
  assert.match(primitive, /role="region"/);
  assert.match(primitive, /aria-label="批次操作"/);
  for (const source of [boardGames, memberships, keys, attendances]) {
    assert.match(source, /<AdminBulkActionBar/);
  }
  assert.match(boardGames, /mobilePresentation="panel"/);
  assert.match(boardGames, /desktopBreakpoint="xl"/);
  for (const source of [memberships, attendances, suggestions]) {
    assert.match(source, /mobilePresentation="panel"/);
  }
  assert.match(keys, /mobilePresentation="inline"/);
  assert.doesNotMatch(primitive, /overflow-x-auto|flex-nowrap/);
  assert.match(primitive, /mobileActions/);
  assert.match(primitive, /mobileNotice/);
  assert.match(primitive, /desktopBreakpoint/);
  assert.match(memberships, /依第一筆學年度篩選/);
  assert.match(memberships, /academic_year_id/);
});

test("bulk-enabled mobile collections enter an explicit management mode", async () => {
  const [toggle, boardGames, memberships, keys, attendances, suggestions] = await Promise.all([
    read("src/components/(admin)/admin/AdminMobileBulkModeButton.tsx"),
    read("src/components/(admin)/admin/board-games/BoardGameTable.tsx"),
    read("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
    read("src/components/(admin)/admin/memberships/RegisterKeyTable.tsx"),
    read("src/components/(admin)/admin/events/AttendanceRecords.tsx"),
    read("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionList.tsx"),
  ]);
  assert.match(toggle, /aria-pressed=\{active\}/);
  assert.match(toggle, /"選取"/);
  assert.match(toggle, /"完成"/);
  assert.match(toggle, /已選 \{selectedCount\} 筆/);
  for (const source of [boardGames, memberships, keys, attendances, suggestions]) {
    assert.match(source, /mobileBulkMode/);
    assert.match(source, /<AdminMobileBulkModeButton/);
  }
  assert.match(keys, /<TableCell className="w-12">[\s\S]*?<AdminSelectionCheckbox/);
  assert.doesNotMatch(keys, /<TableCell className="w-12">[\s\S]*?mobileBulkMode \? <AdminSelectionCheckbox/);
});

test("purchase suggestions expose page-scoped accessible bulk review controls", async () => {
  const source = await read("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionList.tsx");
  assert.match(source, /<AdminBulkActionBar/);
  assert.match(source, /標記已購入/);
  assert.match(source, /標記不採納/);
  assert.match(source, /label=\{`選取桌遊推薦/);
  assert.match(source, /selectedItems\.map\(\(\{ id, version \}\)/);
  assert.match(source, /<ConfirmDialog/);
  assert.match(source, /router\.refresh\(\)/);
});

test("purchase suggestion batch API keeps authorization, validation, and one atomic RPC boundary", async () => {
  const [route, schema, service, repository, migration] = await Promise.all([
    read("src/app/api/admin/board-games/suggests/batch/route.ts"),
    read("src/services/purchase-suggestions/purchase-suggestions.schema.ts"),
    read("src/services/purchase-suggestions/purchase-suggestions.service.ts"),
    read("src/repositories/purchase-suggestions.repository.ts"),
    read("supabase/migrations/202610150005_bulk_delete_board_game_purchase_suggestions.sql"),
  ]);
  assert.match(route, /authorizeAdminRequest/);
  assert.match(route, /authorization\.user\.id/);
  assert.match(schema, /bulkManagePurchaseSuggestionsSchema/);
  assert.match(schema, /"delete"/);
  assert.match(schema, /\.min\(1\)\.max\(100\)/);
  assert.match(schema, /new Set/);
  assert.match(service, /bulkManagePurchaseSuggestionsSchema\.parse/);
  assert.match(repository, /manage_board_game_purchase_suggestions/);
  assert.match(migration, /order by suggestion\.id[\s\S]*for update of suggestion/);
  assert.match(migration, /v_updated_count <> v_expected_count/);
  assert.match(migration, /set deleted_at = clock_timestamp\(\)/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to authenticated/);
});

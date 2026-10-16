import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("bulk-enabled mobile cards separate data from row actions and hide them in selection mode", async () => {
  const sources = await Promise.all([
    read("src/components/(admin)/admin/board-games/BoardGameTable.tsx"),
    read("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
    read("src/components/(admin)/admin/memberships/RegisterKeyTable.tsx"),
    read("src/components/(admin)/admin/events/AttendanceRecords.tsx"),
    read("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionList.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /!mobileBulkMode \? [\s\S]*border-t border-\(--border-muted\) pt-3/);
  }

  assert.match(sources[0], /!mobileBulkMode \? \([\s\S]*<BoardGameRowActions/);
  assert.match(sources[1], /!mobileBulkMode \? <div[\s\S]*<MembershipRowActions/);
  assert.match(sources[2], /!mobileBulkMode \? \([\s\S]*<RegisterKeyActions/);
  assert.match(sources[3], /!mobileBulkMode \? <div[\s\S]*<AttendanceRowActions/);
  assert.match(sources[4], /!mobileBulkMode \? <div[\s\S]*<PurchaseSuggestionActions/);
});

test("desktop row actions remain present for all five collections", async () => {
  const [boardGames, memberships, registerKeys, attendances, suggestions] =
    await Promise.all([
      read("src/components/(admin)/admin/board-games/BoardGameTable.tsx"),
      read("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
      read("src/components/(admin)/admin/memberships/RegisterKeyTable.tsx"),
      read("src/components/(admin)/admin/events/AttendanceRecords.tsx"),
      read("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionList.tsx"),
    ]);

  assert.match(boardGames, /<TableCell className="whitespace-nowrap text-right">[\s\S]*<BoardGameRowActions/);
  assert.match(memberships, /<TableCell className="whitespace-nowrap text-right">[\s\S]*<MembershipRowActions/);
  assert.match(registerKeys, /<TableCell className="text-right">[\s\S]*<RegisterKeyActions/);
  assert.match(attendances, /<TableCell className="whitespace-nowrap text-right">[\s\S]*<AttendanceRowActions/);
  assert.match(suggestions, /<TableCell className="min-w-56 text-right">[\s\S]*<PurchaseSuggestionActions/);
});

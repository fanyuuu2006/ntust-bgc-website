import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin dashboard prioritizes actionable borrowing work over decorative KPI cards", async () => {
  const dashboard = await readSource("src/app/(admin)/admin/page.tsx");

  assert.match(dashboard, /待處理借用申請/);
  assert.match(dashboard, /已核准待借出/);
  assert.match(dashboard, /\/admin\/board-games\/borrowings\?status=pending/);
  assert.match(dashboard, /\/admin\/board-games\/borrowings\?status=approved/);
  assert.doesNotMatch(dashboard, /QuickStats/);
});

test("admin mobile drawer returns focus to its menu trigger after close", async () => {
  const [shell, header] = await Promise.all([
    readSource("src/components/layouts/AdminShell.tsx"),
    readSource("src/components/(admin)/AdminHeader.tsx"),
  ]);

  assert.match(shell, /menuButtonRef/);
  assert.match(shell, /menuButtonRef\.current\?\.focus\(\)/);
  assert.match(header, /menuButtonRef/);
  assert.match(header, /ref=\{menuButtonRef\}/);
});

test("admin list actions stay explicit and destructive actions remain canonical danger buttons", async () => {
  const [events, boardGames, attendances] = await Promise.all([
    readSource("src/components/(admin)/admin/events/EventRecords.tsx"),
    readSource("src/components/(admin)/admin/board-games/BoardGameTable.tsx"),
    readSource("src/components/(admin)/admin/events/AttendanceRecords.tsx"),
  ]);

  assert.match(events, /簽到管理/);
  assert.match(boardGames, /variant="danger"/);
  assert.match(attendances, /variant="danger"/);
  assert.match(attendances, /使用者名稱/);
  assert.match(attendances, /真實姓名/);
});

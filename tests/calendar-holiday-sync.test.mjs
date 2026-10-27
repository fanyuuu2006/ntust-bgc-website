import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOfficialCsv } from "../scripts/sync-calendar-holidays.mjs";

const csv = "\uFEFF日期,放假,節日名稱\n2027/01/01,2,開國紀念日\n2027/01/02,0,補行上班日\n";

test("normalizes BOM CSV and distinguishes holiday/workday", () => {
  assert.deepEqual(normalizeOfficialCsv(csv, 2027), [
    { date: "2027-01-01", name: "開國紀念日", kind: "holiday" },
    { date: "2027-01-02", name: "補行上班日", kind: "makeup_workday" },
  ]);
});

test("rejects duplicate dates and wrong years", () => {
  assert.throws(() => normalizeOfficialCsv("日期,放假\n2027-01-01,2\n2027-01-01,0\n", 2027), /重複日期/);
  assert.throws(() => normalizeOfficialCsv("日期,放假\n2026-01-01,2\n", 2027), /年度錯誤/);
});

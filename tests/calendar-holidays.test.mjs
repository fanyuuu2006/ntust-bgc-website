import assert from "node:assert/strict";
import test from "node:test";
import { getTaiwanHoliday } from "../src/components/calendar/calendar-holidays.ts";
import { isPocSunday } from "../src/components/calendar/calendar-utils.ts";

test("calendar dates use stable Taipei date semantics", () => {
  assert.equal(isPocSunday("2026-10-25"), true);
  assert.equal(isPocSunday("2026-10-24"), false);
});

test("holiday and makeup-workday entries remain distinct", () => {
  assert.equal(getTaiwanHoliday("2026-10-10")?.kind, "holiday");
  assert.equal(getTaiwanHoliday("2026-02-07")?.kind, "makeup_workday");
});

test("unsupported years are not presented as complete data", () => {
  assert.equal(getTaiwanHoliday("2028-01-01"), undefined);
});

test("the 2027 official-year snapshot is available to both calendar adapters", () => {
  assert.equal(getTaiwanHoliday("2027-01-01")?.kind, "holiday");
  assert.equal(getTaiwanHoliday("2027-10-11")?.shortName, "補假");
});

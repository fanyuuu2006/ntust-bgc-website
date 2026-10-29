import assert from "node:assert/strict";
import test from "node:test";
import { load } from "./helpers/load-app-module.mjs";

const recurrence = load("src/services/events/recurrence.ts");

const rule = (frequency, extra = {}) => ({ frequency, interval: 1, count: 3, ...extra });

test("daily recurrence supports interval and count", () => {
  const items = recurrence.generateOccurrences({ startDate: "2026-01-01", startTime: "10:00", endTime: "11:00", recurrenceRule: rule("daily", { interval: 2 }) });
  assert.deepEqual(items.map((item) => item.originalStartTime), ["2026-01-01T10:00", "2026-01-03T10:00", "2026-01-05T10:00"]);
});

test("weekly recurrence supports selected weekdays and crossing months", () => {
  const items = recurrence.generateOccurrences({ startDate: "2026-01-30", startTime: "10:00", endTime: "11:00", recurrenceRule: rule("weekly", { count: 4, byWeekday: [5, 0] }) });
  assert.equal(items.length, 4);
  assert.equal(items[0].originalStartTime, "2026-01-30T10:00");
  assert.equal(items[3].originalStartTime.slice(0, 7), "2026-02");
});

test("monthly recurrence skips nonexistent month days", () => {
  const items = recurrence.generateOccurrences({ startDate: "2026-01-31", startTime: "10:00", endTime: "11:00", recurrenceRule: rule("monthly", { count: 4 }) });
  assert.deepEqual(items.map((item) => item.originalStartTime), ["2026-01-31T10:00", "2026-03-31T10:00", "2026-05-31T10:00", "2026-07-31T10:00"]);
});

test("timezone conversion and cross-day activities preserve stable identity", () => {
  const input = { startDate: "2026-03-08", startTime: "23:30", endTime: "01:00", timezone: "America/New_York", recurrenceRule: rule("daily", { count: 1 }) };
  const first = recurrence.generateOccurrences(input)[0];
  const second = recurrence.generateOccurrences(input)[0];
  assert.equal(first.recurrenceInstanceKey, second.recurrenceInstanceKey);
  assert.ok(new Date(first.endTime) > new Date(first.startTime));
});

test("validation rejects unbounded, invalid, and oversized rules", () => {
  assert.equal(recurrence.recurrenceRuleSchema.safeParse({ frequency: "daily", interval: 0, count: 1 }).success, false);
  assert.equal(recurrence.recurrenceRuleSchema.safeParse({ frequency: "daily", interval: 1 }).success, false);
  assert.equal(recurrence.recurrenceRuleSchema.safeParse({ frequency: "weekly", interval: 1, count: 1, byWeekday: [7] }).success, false);
  assert.equal(recurrence.recurrenceRuleSchema.safeParse({ frequency: "daily", interval: 1, count: 201 }).success, false);
});

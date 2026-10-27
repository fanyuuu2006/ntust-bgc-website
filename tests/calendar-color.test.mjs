import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CALENDAR_COLOR, getCalendarColor, isCalendarColor } from "../src/utils/calendar-color.ts";

test("accepts six-digit hexadecimal calendar colors", () => {
  assert.equal(isCalendarColor("#2563EB"), true);
  assert.equal(isCalendarColor("#abc123"), true);
  assert.equal(isCalendarColor("red"), false);
  assert.equal(isCalendarColor("#12345"), false);
  assert.equal(isCalendarColor("url(https://example.com)"), false);
});

test("falls back safely when a color is missing or invalid", () => {
  assert.equal(getCalendarColor(null), DEFAULT_CALENDAR_COLOR);
  assert.equal(getCalendarColor(undefined), DEFAULT_CALENDAR_COLOR);
  assert.equal(getCalendarColor("invalid"), DEFAULT_CALENDAR_COLOR);
  assert.equal(getCalendarColor("#00ff00"), "#00ff00");
});

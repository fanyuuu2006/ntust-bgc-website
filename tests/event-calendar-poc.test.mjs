import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile(new URL("../src/components/calendar/EventCalendar.tsx", import.meta.url), "utf8");

test("shared Calendar keeps its interactions local", async () => {
  const text = await source();
  assert.doesNotMatch(text, /MOCK_EVENTS/);
  assert.match(text, /selectDate/);
  assert.match(text, /setSelectedEvent/);
  assert.doesNotMatch(text, /apiClient\(/);
});

test("Calendar PoC is a thin mock-data adapter", async () => {
  const text = await readFile(new URL("../src/components/(admin)/admin/events/EventCalendarPoc.tsx", import.meta.url), "utf8");
  assert.match(text, /EventCalendar/);
  assert.match(text, /MOCK_EVENTS/);
  assert.doesNotMatch(text, /fetch\(/);
  const fixture = await readFile(new URL("../src/components/(admin)/admin/events/calendar-poc-fixtures.ts", import.meta.url), "utf8");
  assert.match(fixture, /MOCK_EVENTS/);
});

test("Calendar PoC includes month, list, and cancelled-state presentation", async () => {
  const text = await source();
  assert.match(text, /getPocMonthDays/);
  assert.match(text, /view === \"month\"/);
  assert.match(text, /PocEventCard/);
  assert.match(text, /event-calendar-event-card-cancelled/);
});

test("Calendar details use schema-aligned optional fields and neutral black presentation", async () => {
  const text = await source();
  const fixture = await readFile(new URL("../src/components/(admin)/admin/events/calendar-poc-fixtures.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/components/(admin)/admin/events/event-calendar-poc.css", import.meta.url), "utf8");
  assert.match(fixture, /color: "black"/);
  assert.match(text, /EventDetailsContent/);
  assert.match(fixture, /checkInOpensAt/);
  assert.doesNotMatch(text, /location:/);
  assert.match(css, /event-calendar-event-chip-black/);
  assert.match(css, /event-calendar-event-indicator-black/);
});

test("Calendar presentation keeps mobile events textual and date states distinct", async () => {
  const text = await source();
  const css = await readFile(new URL("../src/components/(admin)/admin/events/event-calendar-poc.css", import.meta.url), "utf8");
  assert.match(text, /aria-current=\{isToday \? "date"/);
  assert.match(text, /event-calendar-month-cell-selected/);
  assert.match(css, /event-calendar-month-grid/);
  assert.match(css, /event-calendar-month-event-indicator/);
  assert.doesNotMatch(css, /fc-daygrid/);
});

test("FullCalendar PoC uses an external toolbar and selected-day presentation", async () => {
  const text = await source();
  assert.match(text, /navigateMonth\(-1\)/);
  assert.match(text, /navigateMonth\(1\)/);
  assert.match(text, /event-calendar-layout/);
  assert.match(text, /getEventsForDate/);
  assert.match(text, /aria-pressed/);
  assert.match(text, /<Modal\s+open=\{selectedEvent !== null\}/);
  assert.match(text, /活動詳情/);
});

test("List and selected-day agenda share one keyboard-accessible event card", async () => {
  const text = await source();
  const cardUsages = text.match(/<PocEventCard/g) ?? [];
  assert.match(text, /function PocEventCard/);
  assert.equal(cardUsages.length, 2);
  assert.match(text, /event-calendar-event-card-title/);
  assert.doesNotMatch(text, /function EventSummary/);
});

test("Calendar PoC uses the shared admin page header contract", async () => {
  const page = await readFile(new URL("../src/app/(admin)/admin/events/calendar-poc/page.tsx", import.meta.url), "utf8");
  assert.match(page, /HeadingSection/);
  assert.match(page, /AdminBreadcrumbs/);
  assert.match(page, /活動行事曆/);
  assert.match(page, /管理與查看社團活動行程/);
});

test("selected-date formatting is deterministic and timezone-independent", async () => {
  const moduleUrl = new URL("../src/components/(admin)/admin/events/calendar-poc-utils.ts", import.meta.url).href;
  const output = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `const m = await import(${JSON.stringify(moduleUrl)}); console.log(m.formatPocSelectedDate("2026-10-25"));`], { encoding: "utf8" }).trim();
  assert.equal(output.split("\n").at(-1), "10 月 25 日・週日");
  assert.doesNotMatch(await readFile(new URL("../src/components/(admin)/admin/events/calendar-poc-utils.ts", import.meta.url), "utf8"), /toLocaleDateString|Intl\.DateTimeFormat/);
});

test("date filtering uses Taipei half-open day overlap semantics", async () => {
  const moduleUrl = new URL("../src/components/(admin)/admin/events/calendar-poc-utils.ts", import.meta.url).href;
  const events = [
    { id: "a", title: "same day", start: "2026-10-27T10:00:00+08:00", end: "2026-10-27T12:00:00+08:00" },
    { id: "b", title: "overnight", start: "2026-10-30T19:00:00+08:00", end: "2026-11-01T00:30:00+08:00" },
    { id: "c", title: "midnight end", start: "2026-11-02T22:00:00+08:00", end: "2026-11-03T00:00:00+08:00" },
  ];
  const script = `const m = await import(${JSON.stringify(moduleUrl)}); const events = ${JSON.stringify(events)}; console.log(JSON.stringify([m.getEventsForDate(events, "2026-10-27").map(e=>e.id), m.getEventsForDate(events, "2026-10-31").map(e=>e.id), m.getEventsForDate(events, "2026-11-03").map(e=>e.id)]));`;
  const output = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8" }).trim();
  assert.deepEqual(JSON.parse(output.split("\n").at(-1)), [["a"], ["b"], []]);
});

test("calendar API range follows the visible grid and keeps list semantics separate", async () => {
  const moduleUrl = new URL("../src/components/calendar/calendar-utils.ts", import.meta.url).href;
  const output = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `const m = await import(${JSON.stringify(moduleUrl)}); console.log(JSON.stringify([m.getPocCalendarViewRange("2026-10-01"), m.getPocCalendarViewRange("2026-02-01"), m.getPocCalendarViewRange("2027-01-01")]));`], { encoding: "utf8" }).trim();
  const [october, february, january] = JSON.parse(output.split("\n").at(-1));
  assert.deepEqual(october, { from: "2026-09-27T00:00:00+08:00", to: "2026-11-08T00:00:00+08:00" });
  assert.deepEqual(february, { from: "2026-02-01T00:00:00+08:00", to: "2026-03-01T00:00:00+08:00" });
  assert.deepEqual(january, { from: "2026-12-27T00:00:00+08:00", to: "2027-02-07T00:00:00+08:00" });
});

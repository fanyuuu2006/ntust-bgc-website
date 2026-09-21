import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const now = new Date("2026-09-21T08:00:00Z");
const game = { id: "00000000-0000-4000-8000-000000000001", name: "很長的桌遊名稱".repeat(12), inventory_number: 900001 };
const borrowing = (status, due_at = null) => ({ id: `${status}-${due_at}`, status, due_at, board_game: game });

test("dashboard borrowing priority uses the canonical due-time states", () => {
  const { getDashboardBorrowingPriority: priority } = load("src/services/board-games/dashboard-borrowing-priority.ts");
  assert.equal(priority(borrowing("borrowed", "2026-09-20T08:00:00Z"), now), 0);
  assert.equal(priority(borrowing("approved"), now), 1);
  assert.equal(priority(borrowing("borrowed", "2026-09-21T18:00:00Z"), now), 2);
  assert.equal(priority(borrowing("borrowed", "2026-10-03T08:00:00Z"), now), 3);
  assert.equal(priority(borrowing("pending"), now), 4);
});

test("no attendance renders no empty card; open and completed attendance remain distinct", () => {
  const { SelfCheckInEvents } = load("src/components/(authenticated)/dashboard/SelfCheckInEvents.tsx", {
    "@/components/(authenticated)/dashboard/CheckInButton": { CheckInButton: ({ eventId }) => createElement("button", { type: "button" }, `簽到 ${eventId}`) },
  });
  assert.equal(renderToStaticMarkup(createElement(SelfCheckInEvents, { events: [] })), "");
  const event = { id: "event-1", name: "桌遊交流", start_time: "2026-09-21T08:00:00Z", end_time: "2026-09-21T10:00:00Z" };
  const open = renderToStaticMarkup(createElement(SelfCheckInEvents, { events: [{ event, attendance: null }] }));
  assert.match(open, /桌遊交流/);
  assert.match(open, /簽到 event-1/);
  assert.ok(open.indexOf("桌遊交流") < open.indexOf("簽到 event-1"));
  assert.ok(open.indexOf("簽到 event-1") < open.indexOf("2026/09/21"), "time follows the title/action row");
  const longTitle = renderToStaticMarkup(createElement(SelfCheckInEvents, { events: [{ event: { ...event, name: "很長的活動名稱".repeat(10) }, attendance: null }] }));
  assert.match(longTitle, /很長的活動名稱/);
  assert.match(longTitle, /簽到 event-1/);
  const signed = renderToStaticMarkup(createElement(SelfCheckInEvents, { events: [{ event, attendance: { event_id: event.id } }] }));
  assert.match(signed, /已簽到/);
  assert.doesNotMatch(signed, /<button/);
});

test("borrowing preview preserves detail return, urgency, and complete-history navigation", () => {
  const { DashboardBorrowingSummary } = load("src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx");
  const html = renderToStaticMarkup(createElement(DashboardBorrowingSummary, { borrowings: [
    borrowing("borrowed", "2026-09-20T08:00:00Z"),
    borrowing("approved"),
  ] }));
  assert.match(html, /已逾期/);
  assert.match(html, /已核准，等待領取/);
  assert.match(html, /href="\/borrowings"/);
  assert.match(html, /returnTo=%2Fdashboard/);
  assert.match(html, /社產編號 #900001/);
});

test("membership and announcement empty states stay contextual without borrowing eligibility claims", async () => {
  const { DashboardMembershipSummary } = load("src/components/(authenticated)/dashboard/DashboardMembershipSummary.tsx");
  const missing = renderToStaticMarkup(createElement(DashboardMembershipSummary, { membership: null, academicYearLabel: "115" }));
  assert.match(missing, /尚未取得 115 學年度社員資格/);
  assert.match(missing, /href="\/memberships"/);
  assert.doesNotMatch(missing, /不能借|無法借/);
  const page = await readFile(new URL("../src/app/(authenticated)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<PageHeader title=\{`歡迎回來，\$\{user\.name\}`\} \/>/);
  assert.doesNotMatch(page, /有幾件事情值得你留意|目前沒有需要處理的事項/);
  assert.match(page, /目前還沒有已發布的公告/);
  assert.match(page, /href="\/announcements"/);
  assert.match(page, /announcements\.data\.map/);
  assert.doesNotMatch(page, /announcement\.content/);
});

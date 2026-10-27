import type { PocCalendarEvent } from "@/components/calendar/calendar-utils";

/** 僅供 /admin/events/calendar-poc 展示與測試使用的固定資料。 */
export const MOCK_EVENTS: PocCalendarEvent[] = [
  { id: "single", title: "一般單日活動", color: "blue", start: "2026-10-25T19:00:00+08:00", end: "2026-10-25T21:00:00+08:00" },
  { id: "same-day-1", title: "同日早場活動", color: "green", start: "2026-10-27T10:00:00+08:00", end: "2026-10-27T12:00:00+08:00" },
  { id: "same-day-2", title: "同日晚場活動", color: "violet", start: "2026-10-27T19:00:00+08:00", end: "2026-10-27T21:30:00+08:00" },
  { id: "overnight", title: "跨日活動：週末桌遊聚會", color: "orange", start: "2026-10-30T19:00:00+08:00", end: "2026-11-01T00:30:00+08:00" },
  { id: "cancelled", title: "已取消的長名稱活動", color: "red", start: "2026-11-03T18:30:00+08:00", end: "2026-11-03T20:30:00+08:00", cancelled: true },
  { id: "long-title", title: "這是一個用來驗證活動清單在桌面與手機寬度下自然換行的長活動名稱示例，包含中英文混排 Board Game Workshop", color: "cyan", start: "2026-11-15T09:00:00+08:00", end: "2026-11-15T10:30:00+08:00", checkInOpensAt: "2026-11-15T08:30:00+08:00", checkInClosesAt: "2026-11-15T09:15:00+08:00", description: "地點：社團教室 A\n\n這是一段較長的活動說明，用來驗證 Modal 內容捲動、長文字換行與不同畫面尺寸下的閱讀體驗。\n\n歡迎社員攜帶喜歡的桌遊參加。" },
  { id: "multi-2", title: "同日第三場活動", color: "green", start: "2026-11-15T13:00:00+08:00", end: "2026-11-15T14:00:00+08:00" },
  { id: "multi-3", title: "EnglishOnlyLongActivityNameWithoutSpacesForWrapping", color: "violet", start: "2026-11-15T15:00:00+08:00", end: "2026-11-15T16:00:00+08:00" },
  { id: "multi-4", title: "同日第四場活動", color: "orange", start: "2026-11-15T19:00:00+08:00", end: "2026-11-15T21:00:00+08:00" },
  { id: "neutral", title: "黑色主題活動", color: "black", start: "2026-11-20T18:00:00+08:00", end: "2026-11-20T20:00:00+08:00" },
  { id: "rich-description", title: "Rich Text 活動介紹範例", color: "blue", start: "2026-11-22T14:00:00+08:00", end: "2026-11-22T16:00:00+08:00", description: "Rich Text 活動介紹", descriptionFormat: "rich_text_v1", richDescription: { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "活動重點" }] }, { type: "paragraph", content: [{ type: "text", text: "包含段落、" }, { type: "text", text: "安全連結", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "攜帶喜歡的桌遊" }] }] }] }] } }
];

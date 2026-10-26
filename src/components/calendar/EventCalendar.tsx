"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { CalendarSurface } from "@/components/calendar/CalendarSurface";
import { addPocMonths, formatPocDateInput, formatPocSelectedDate, formatPocTimeRange, getEventsForDate, getEventsForMonth, getPocMonthDays, type PocCalendarEvent } from "./calendar-utils";
import "./calendar.css";
// CalendarSurface supplies the shared poc-calendar-layout shell used by PublicEventCalendar.

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
  { id: "rich-description", title: "Rich Text 活動介紹範例", color: "blue", start: "2026-11-22T14:00:00+08:00", end: "2026-11-22T16:00:00+08:00", description: "Rich Text 活動介紹", descriptionFormat: "rich_text_v1", richDescription: { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "活動重點" }] }, { type: "paragraph", content: [{ type: "text", text: "包含段落、" }, { type: "text", text: "安全連結", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "攜帶喜歡的桌遊" }] }] }] }] } },
];
const INITIAL_MONTH = "2026-10-01";
function eventTone(event: PocCalendarEvent) { return event.color ?? "blue"; }
function PocEventCard({ event, onOpen }: { event: PocCalendarEvent; onOpen: (event: PocCalendarEvent) => void }) {
  return <button type="button" className={`poc-event-card poc-event-card-${eventTone(event)}${event.cancelled ? " poc-event-card-cancelled" : ""}`} aria-label={`${event.title}，${formatPocTimeRange(event)}${event.cancelled ? "，已取消" : ""}${event.publicationStatus === "draft" ? "，草稿" : ""}，查看詳情`} onClick={() => onOpen(event)}><span className="poc-event-card-main"><span className="poc-event-card-title-row"><strong className="poc-event-card-title">{event.title}</strong>{event.cancelled ? <span className="poc-event-card-status">已取消</span> : event.publicationStatus === "draft" ? <span className="poc-event-card-status">草稿</span> : null}</span></span><span className="poc-event-card-time">{formatPocTimeRange(event)}</span><span className="poc-event-card-action">查看詳情</span></button>;
}
export function EventCalendar({ events: providedEvents = MOCK_EVENTS, onMonthChange }: { events?: PocCalendarEvent[]; onMonthChange?: (month: string) => void }) {
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(INITIAL_MONTH);
  const [selectedDate, setSelectedDate] = useState("2026-10-25");
  const [selectedEvent, setSelectedEvent] = useState<PocCalendarEvent | null>(null);
  const [notice, setNotice] = useState("尚未選取活動或日期");
  const monthInputRef = useRef<HTMLInputElement>(null);
  const [supportsShowPicker, setSupportsShowPicker] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSupportsShowPicker(typeof HTMLInputElement !== "undefined" && "showPicker" in HTMLInputElement.prototype);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // The default adapter remains the PoC MOCK_EVENTS; PublicEventCalendar supplies API data via props.
  const events = useMemo(() => providedEvents, [providedEvents]);
  const monthDays = useMemo(() => getPocMonthDays(month), [month]);
  const selectedEvents = getEventsForDate(events, selectedDate);
  const listEvents = useMemo(() => getEventsForMonth(events, month), [events, month]);
  const listGroups = useMemo(() => {
    const monthEventIds = new Set(listEvents.map((event) => event.id));
    return monthDays.filter((day) => !day.outsideMonth).reduce<Map<string, PocCalendarEvent[]>>((groups, day) => {
      const dateEvents = getEventsForDate(events, day.date).filter((event) => monthEventIds.has(event.id));
      if (dateEvents.length) groups.set(day.date, dateEvents.sort((a, b) => a.start.localeCompare(b.start)));
      return groups;
    }, new Map());
  }, [events, listEvents, monthDays]);
  const monthTitle = month.slice(0, 4) + " 年 " + Number(month.slice(5, 7)) + " 月";
  const selectDate = (date: string) => { setSelectedDate(date); setNotice("Mock：選取日期 " + date + "（未呼叫正式 API）"); };
  const navigateMonth = (offset: number) => { const next = addPocMonths(month, offset); setMonth(next); onMonthChange?.(next.slice(0, 7)); if (selectedDate.slice(0, 7) !== next.slice(0, 7)) setSelectedDate(next); };
  const goToday = () => { const today = formatPocDateInput(new Date()); setMonth(today.slice(0, 7) + "-01"); onMonthChange?.(today.slice(0, 7)); setSelectedDate(today); };
  const handleMonthInput = (value: string) => { if (!/^\d{4}-\d{2}$/.test(value)) return; const year = Number(value.slice(0, 4)); const monthNumber = Number(value.slice(5, 7)); const day = Math.min(Number(selectedDate.slice(8, 10)), new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()); setMonth(value + "-01"); onMonthChange?.(value); setSelectedDate(value + "-" + String(day).padStart(2, "0")); };
  const openMonthPicker = () => {
    const input = monthInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) return;
    if (supportsShowPicker && typeof input.showPicker === "function") {
      try { input.showPicker(); return; } catch { setSupportsShowPicker(false); }
    }
    input.focus();
  };
  return <section className="container py-2 sm:py-4">
    <p className="mb-3 text-xs text-(--text-muted)" role="status">{notice}</p>
    <div className="poc-calendar-toolbar mb-3" aria-label="月份導覽"><div className="poc-calendar-navigation"><Button type="button" variant="ghost" size="sm" iconOnly aria-label="上一個月" onClick={() => navigateMonth(-1)}><ChevronLeft aria-hidden="true" className="size-4" /></Button><Button type="button" variant="ghost" size="sm" iconOnly aria-label="下一個月" onClick={() => navigateMonth(1)}><ChevronRight aria-hidden="true" className="size-4" /></Button><Button type="button" variant="outline" size="sm" onClick={goToday}>今天</Button></div>{supportsShowPicker ? <button type="button" className="poc-month-title" onClick={openMonthPicker} aria-haspopup="dialog" aria-label={`選擇年月，目前為${monthTitle}`}><Calendar aria-hidden="true" className="poc-month-title-icon" /><span>{monthTitle}</span><ChevronDown aria-hidden="true" className="poc-month-title-chevron" /></button> : null}<input ref={monthInputRef} className={supportsShowPicker ? "poc-month-input-native poc-month-input-native-hidden" : "poc-month-input-native"} aria-label="選擇年月" type="month" value={month.slice(0, 7)} onChange={(event) => handleMonthInput(event.target.value)} /><div className="poc-view-switch" role="group" aria-label="行事曆視圖控制"><Button type="button" size="sm" variant={view === "month" ? "primary" : "ghost"} aria-pressed={view === "month"} onClick={() => setView("month")}>月曆</Button><Button type="button" size="sm" variant={view === "list" ? "primary" : "ghost"} aria-pressed={view === "list"} onClick={() => setView("list")}>列表</Button></div></div>
    <CalendarSurface><section className="poc-calendar-surface" aria-label="固定 Mock 活動行事曆">
      {view === "month" ? <div className="poc-month-grid" role="grid" aria-label={monthTitle}>{["一", "二", "三", "四", "五", "六", "日"].map((day) => <div className="poc-weekday" role="columnheader" key={day}>{day}</div>)}{monthDays.map(({ date, day, outsideMonth }) => { const dayEvents = getEventsForDate(events, date); const isSelected = date === selectedDate; const isToday = date === formatPocDateInput(new Date()); const mobileIndicators = dayEvents.length <= 3 ? dayEvents.slice(0, 3).map((event) => <span key={`indicator-${event.id}`} className={`poc-month-event-indicator poc-event-indicator poc-event-indicator-${eventTone(event)}`} />) : <span className="poc-event-count">{dayEvents.length}</span>; return <button type="button" role="gridcell" key={date} className={"poc-month-cell" + (outsideMonth ? " poc-month-cell-outside" : "") + (isSelected ? " poc-month-cell-selected" : "") + (isToday ? " poc-month-cell-today" : "")} aria-label={"選取" + formatPocSelectedDate(date) + "，" + dayEvents.length + " 個活動"} aria-current={isToday ? "date" : undefined} onClick={() => selectDate(date)}><span className="poc-month-day-number">{day}</span>{dayEvents.length > 0 ? <span className="poc-month-event-list" aria-hidden="true">{dayEvents.slice(0, 2).map((event) => <span key={event.id} className={"poc-event-chip poc-event-chip-" + eventTone(event)}>{event.cancelled ? "已取消" : event.title}</span>)}{mobileIndicators}{dayEvents.length > 2 ? <span className="poc-event-more">+{dayEvents.length - 2} 個</span> : null}</span> : null}</button>; })}</div> : <div className="poc-agenda-list" aria-label="活動列表">{listGroups.size ? Array.from(listGroups, ([date, dateEvents]) => <section className="poc-list-group" key={date}><div className="poc-list-group-heading"><h3 className="poc-list-group-title">{formatPocSelectedDate(date)}</h3><span>{dateEvents.length} 個活動</span></div>{dateEvents.map((event) => <PocEventCard key={event.id} event={event} onOpen={setSelectedEvent} />)}</section>) : <div className="poc-empty-day"><p>這個月份沒有安排活動</p><span>請切換其他月份查看活動</span></div>}</div>}
    </section>{view === "month" ? <section className="poc-selected-day" aria-labelledby="poc-selected-day-title"><div className="poc-agenda-toolbar"><h2 id="poc-selected-day-title">{formatPocSelectedDate(selectedDate)}</h2><span>{selectedEvents.length} 個活動</span></div>{selectedEvents.length ? <div className="poc-selected-events">{selectedEvents.map((event) => <PocEventCard key={event.id} event={event} onOpen={setSelectedEvent} />)}</div> : <div className="poc-empty-day"><CalendarDays aria-hidden="true" className="poc-empty-day-icon" /><p>當天沒有安排活動</p><span>選擇其他日期查看活動</span></div>}</section> : null}</CalendarSurface>
    <Modal open={selectedEvent !== null} onClose={() => setSelectedEvent(null)} title="活動詳情" size="sm">{selectedEvent ? <div className="poc-event-details"><div className="poc-event-details-header"><span className={`poc-modal-color poc-modal-color-${eventTone(selectedEvent)}`} aria-label={`活動顏色：${eventTone(selectedEvent)}`} /><h3 className="poc-event-details-title">{selectedEvent.title}</h3>{selectedEvent.cancelled ? <span className="poc-event-details-status">已取消</span> : null}</div><dl className="poc-event-details-meta"><div><dt>日期與時間</dt><dd>{formatPocSelectedDate(selectedEvent.start.slice(0, 10))}・{formatPocTimeRange(selectedEvent)}</dd></div>{selectedEvent.checkInOpensAt && selectedEvent.checkInClosesAt ? <div><dt>報到時間</dt><dd>{selectedEvent.checkInOpensAt.slice(11, 16)}–{selectedEvent.checkInClosesAt.slice(11, 16)}</dd></div> : null}</dl>{selectedEvent.cancelled ? <p className="poc-event-details-notice">此活動已取消，請勿視為仍可參加。</p> : null}<section className="poc-event-description" aria-labelledby="poc-event-description-title"><h4 id="poc-event-description-title">活動介紹</h4>{selectedEvent.description ? selectedEvent.descriptionFormat === "rich_text_v1" && selectedEvent.richDescription ? <RichTextRenderer content={selectedEvent.description} content_format="rich_text_v1" rich_content={selectedEvent.richDescription} /> : <p className="poc-event-description-plain">{selectedEvent.description}</p> : <p className="poc-event-description-empty">目前沒有活動介紹。</p>}</section></div> : null}</Modal>
  </section>;
}

"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal";
import { addPocMonths, formatPocDateInput, formatPocSelectedDate, formatPocTimeRange, getEventsForDate, getPocMonthDays, type PocCalendarEvent } from "./calendar-poc-utils";
import "./event-calendar-poc.css";

const MOCK_EVENTS: PocCalendarEvent[] = [
  { id: "single", title: "一般單日活動", start: "2026-10-25T19:00:00+08:00", end: "2026-10-25T21:00:00+08:00" },
  { id: "same-day-1", title: "同日早場活動", start: "2026-10-27T10:00:00+08:00", end: "2026-10-27T12:00:00+08:00" },
  { id: "same-day-2", title: "同日晚上活動", start: "2026-10-27T19:00:00+08:00", end: "2026-10-27T21:30:00+08:00" },
  { id: "overnight", title: "跨日活動：週末桌遊聚會", start: "2026-10-30T19:00:00+08:00", end: "2026-11-01T00:30:00+08:00" },
  { id: "cancelled", title: "已取消的長名稱活動（僅供視覺測試）", start: "2026-11-03T18:30:00+08:00", end: "2026-11-03T20:30:00+08:00", cancelled: true },
];

const INITIAL_MONTH = "2026-10-01";

function EventSummary({ event, onOpen }: { event: PocCalendarEvent; onOpen: (event: PocCalendarEvent) => void }) {
  return <li className={`poc-selected-event${event.cancelled ? " poc-selected-event-cancelled" : ""}`}><div className="min-w-0"><p className="poc-selected-event-title">{event.cancelled ? "已取消｜" : ""}{event.title}</p><p className="poc-selected-event-time">{formatPocTimeRange(event)}</p></div><Button type="button" size="sm" variant="ghost" onClick={() => onOpen(event)}>查看詳情</Button></li>;
}

export function EventCalendarPoc() {
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(INITIAL_MONTH);
  const [selectedDate, setSelectedDate] = useState("2026-10-25");
  const [selectedEvent, setSelectedEvent] = useState<PocCalendarEvent | null>(null);
  const [notice, setNotice] = useState("尚未選取活動或日期");
  const events = useMemo(() => MOCK_EVENTS, []);
  const monthDays = useMemo(() => getPocMonthDays(month), [month]);
  const selectedEvents = getEventsForDate(events, selectedDate);
  const monthTitle = `${month.slice(0, 4)} 年 ${Number(month.slice(5, 7))} 月`;
  const selectDate = (date: string) => { setSelectedDate(date); setNotice(`Mock：選取日期 ${date}（未呼叫正式 API）`); };
  const navigateMonth = (offset: number) => { const next = addPocMonths(month, offset); setMonth(next); if (selectedDate.slice(0, 7) !== next.slice(0, 7)) setSelectedDate(next); };
  const goToday = () => { const today = formatPocDateInput(new Date()); setMonth(`${today.slice(0, 7)}-01`); setSelectedDate(today); };

  return <section className="container py-2 sm:py-4">
    <p className="mb-3 text-xs text-(--text-muted)" role="status">{notice}</p>
    <div className="poc-calendar-toolbar mb-3" aria-label="月份導覽">
      <div className="poc-calendar-navigation"><Button type="button" variant="ghost" size="sm" iconOnly aria-label="上一個月" onClick={() => navigateMonth(-1)}><ChevronLeft aria-hidden="true" className="size-4" /></Button><Button type="button" variant="ghost" size="sm" iconOnly aria-label="下一個月" onClick={() => navigateMonth(1)}><ChevronRight aria-hidden="true" className="size-4" /></Button><Button type="button" variant="outline" size="sm" onClick={goToday}>今天</Button></div>
      <h2>{monthTitle}</h2>
      <div className="poc-view-switch" role="group" aria-label="行事曆視圖控制"><Button type="button" size="sm" variant={view === "month" ? "primary" : "ghost"} aria-pressed={view === "month"} onClick={() => setView("month")}>月曆</Button><Button type="button" size="sm" variant={view === "list" ? "primary" : "ghost"} aria-pressed={view === "list"} onClick={() => setView("list")}>列表</Button></div>
    </div>
    <div className="poc-calendar-layout">
      <section className="poc-calendar-surface" aria-label="固定 Mock 活動行事曆">
        {view === "month" ? <div className="poc-month-grid" role="grid" aria-label={monthTitle}>{["一", "二", "三", "四", "五", "六", "日"].map((day) => <div className="poc-weekday" role="columnheader" key={day}>{day}</div>)}{monthDays.map(({ date, day, outsideMonth }) => { const dayEvents = getEventsForDate(events, date); const isSelected = date === selectedDate; const isToday = date === formatPocDateInput(new Date()); return <button type="button" role="gridcell" key={date} className={`poc-month-cell${outsideMonth ? " poc-month-cell-outside" : ""}${isSelected ? " poc-month-cell-selected" : ""}${isToday ? " poc-month-cell-today" : ""}`} aria-label={`選取${formatPocSelectedDate(date)}，${dayEvents.length} 個活動`} aria-current={isToday ? "date" : undefined} onClick={() => selectDate(date)}><span className="poc-month-day-number">{day}</span><span className="poc-month-events" aria-hidden="true">{dayEvents.length > 0 ? <span className="poc-month-event-indicator">{dayEvents.length > 1 ? dayEvents.length : ""}</span> : null}</span></button>; })}</div> : <div className="poc-agenda-list" aria-label="活動列表">{events.length ? events.map((event) => <button type="button" className={`poc-list-event${event.cancelled ? " poc-list-event-cancelled" : ""}`} key={event.id} onClick={() => setSelectedEvent(event)}><span className="poc-list-event-date">{formatPocSelectedDate(event.start.slice(0, 10))}</span><span className="poc-list-event-main"><strong>{event.cancelled ? "已取消｜" : ""}{event.title}</strong><span>{formatPocTimeRange(event)}</span></span></button>) : <p className="poc-empty-day">這段期間沒有活動</p>}</div>}
      </section>
      <section className="poc-selected-day" aria-labelledby="poc-selected-day-title"><div className="poc-agenda-toolbar"><div><h2 id="poc-selected-day-title">{formatPocSelectedDate(selectedDate)}</h2><span>{selectedEvents.length} 個活動</span></div></div>{selectedEvents.length > 0 ? <ul className="poc-selected-events">{selectedEvents.map((event) => <EventSummary key={event.id} event={event} onOpen={setSelectedEvent} />)}</ul> : <div className="poc-empty-day"><p>當日沒有活動</p><span>請選擇其他日期查看活動。</span></div>}</section>
    </div>
    <Modal open={selectedEvent !== null} onClose={() => setSelectedEvent(null)} title="活動詳情" size="sm">{selectedEvent ? <div className="space-y-3 text-sm"><div><p className="text-xs text-(--text-muted)">活動名稱</p><p className="font-semibold text-(--text-primary)">{selectedEvent.title}</p></div><div><p className="text-xs text-(--text-muted)">時間</p><p className="text-(--text-secondary)">{selectedEvent.start.slice(0, 16).replace("T", " ")}–{selectedEvent.end?.slice(11, 16) ?? ""}</p></div><p className={selectedEvent.cancelled ? "font-semibold text-(--text-secondary)" : "text-(--text-secondary)"}>{selectedEvent.cancelled ? "已取消，請勿視為仍可參加。" : "Mock 活動資料，尚未連接正式活動 API。"}</p></div> : null}</Modal>
  </section>;
}

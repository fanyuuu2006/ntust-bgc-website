"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal";
import { CalendarSurface } from "@/components/calendar/CalendarSurface";
import { EventDetailsContent } from "./EventDetailsContent";
import {
  addPocMonths,
  formatPocDateInput,
  formatPocSelectedDate,
  formatPocTimeRange,
  getEventsForDate,
  getEventsForMonth,
  getPocMonthDays,
  isPocSunday,
  isPocSaturday,
  type PocCalendarEvent,
} from "./calendar-utils";
import { getTaiwanHoliday, type CalendarHoliday } from "./calendar-holidays";
import { isCalendarColor } from "@/utils/calendar-color";
import "./calendar.css";
// CalendarSurface supplies the shared event-calendar-layout shell used by PublicEventCalendar.
function eventTone(event: PocCalendarEvent) {
  return event.color ?? "blue";
}

function eventStyle(event: PocCalendarEvent): CSSProperties | undefined {
  return isCalendarColor(event.calendarColor)
    ? ({ "--event-color": event.calendarColor } as CSSProperties)
    : undefined;
}

function eventColorClass(event: PocCalendarEvent, prefix: string) {
  return isCalendarColor(event.calendarColor) ? `${prefix}-custom` : `${prefix}-${eventTone(event)}`;
}

function PocEventCard({
  event,
  onOpen,
}: {
  event: PocCalendarEvent;
  onOpen: (event: PocCalendarEvent) => void;
}) {
  return (
    <button
      type="button"
      className={`event-calendar-event-card ${eventColorClass(event, "event-calendar-event-card")}${event.cancelled ? " event-calendar-event-card-cancelled" : ""}`}
      style={eventStyle(event)}
      aria-label={`${event.title}，${formatPocTimeRange(event)}${event.cancelled ? "，已取消" : ""}${event.publicationStatus === "draft" ? "，草稿" : ""}，查看詳情`}
      onClick={() => onOpen(event)}
    >
      <span className="event-calendar-event-card-main">
        <span className="event-calendar-event-card-title-row">
          <strong className="event-calendar-event-card-title">{event.title}</strong>
          {event.cancelled ? (
            <span className="event-calendar-event-card-status">已取消</span>
          ) : event.publicationStatus === "draft" ? (
            <span className="event-calendar-event-card-status">草稿</span>
          ) : null}
        </span>
      </span>
      <span className="event-calendar-event-card-time">{formatPocTimeRange(event)}</span>
      <span className="event-calendar-event-card-action">查看詳情</span>
    </button>
  );
}
export function EventCalendar({
  events: providedEvents,
  onMonthChange,
  renderEventActions,
  holidays,
}: {
  events: PocCalendarEvent[];
  onMonthChange?: (month: string) => void;
  renderEventActions?: (event: PocCalendarEvent) => ReactNode;
  holidays?: CalendarHoliday[];
}) {
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState("2026-10-01");
  const [selectedDate, setSelectedDate] = useState("2026-10-25");
  const [selectedEvent, setSelectedEvent] = useState<PocCalendarEvent | null>(
    null,
  );
  const [notice, setNotice] = useState("尚未選取活動或日期");
  const monthInputRef = useRef<HTMLInputElement>(null);
  const [supportsShowPicker, setSupportsShowPicker] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Client mount 後才讀取目前日期，避免 Server／Client 初始 render 因時區或跨日產生 hydration mismatch。
      const today = formatPocDateInput(new Date());
      setMonth(`${today.slice(0, 7)}-01`);
      setSelectedDate(today);
      setSupportsShowPicker(
        typeof HTMLInputElement !== "undefined" &&
          "showPicker" in HTMLInputElement.prototype,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const events = useMemo(() => providedEvents, [providedEvents]);
  const monthDays = useMemo(() => getPocMonthDays(month), [month]);
  const selectedEvents = getEventsForDate(events, selectedDate);
  const listEvents = useMemo(
    () => getEventsForMonth(events, month),
    [events, month],
  );
  const listGroups = useMemo(() => {
    const monthEventIds = new Set(listEvents.map((event) => event.id));
    return monthDays
      .filter((day) => !day.outsideMonth)
      .reduce<Map<string, PocCalendarEvent[]>>((groups, day) => {
        const dateEvents = getEventsForDate(events, day.date).filter((event) =>
          monthEventIds.has(event.id),
        );
        if (dateEvents.length)
          groups.set(
            day.date,
            dateEvents.sort((a, b) => a.start.localeCompare(b.start)),
          );
        return groups;
      }, new Map());
  }, [events, listEvents, monthDays]);
  const monthTitle =
    month.slice(0, 4) + " 年 " + Number(month.slice(5, 7)) + " 月";
  const selectDate = (date: string) => {
    setSelectedDate(date);
    setNotice("已選取日期：" + date);
  };
  const navigateMonth = (offset: number) => {
    const next = addPocMonths(month, offset);
    setMonth(next);
    onMonthChange?.(next.slice(0, 7));
    if (selectedDate.slice(0, 7) !== next.slice(0, 7)) setSelectedDate(next);
  };
  const goToday = () => {
    const today = formatPocDateInput(new Date());
    setMonth(today.slice(0, 7) + "-01");
    onMonthChange?.(today.slice(0, 7));
    setSelectedDate(today);
  };
  const handleMonthInput = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    const year = Number(value.slice(0, 4));
    const monthNumber = Number(value.slice(5, 7));
    const day = Math.min(
      Number(selectedDate.slice(8, 10)),
      new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(),
    );
    setMonth(value + "-01");
    onMonthChange?.(value);
    setSelectedDate(value + "-" + String(day).padStart(2, "0"));
  };
  const openMonthPicker = () => {
    const input = monthInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    if (!input) return;
    if (supportsShowPicker && typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        setSupportsShowPicker(false);
      }
    }
    input.focus();
  };
  return (
    <section className="w-full min-w-0 py-2 sm:py-4">
      <p className="mb-3 text-xs text-(--text-muted)" role="status">
        {notice}
      </p>
      <div className="event-calendar-toolbar mb-3" aria-label="月份導覽">
        <div className="event-calendar-navigation">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="上一個月"
            onClick={() => navigateMonth(-1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="下一個月"
            onClick={() => navigateMonth(1)}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            今天
          </Button>
        </div>
        {supportsShowPicker ? (
          <button
            type="button"
            className="event-calendar-month-title"
            onClick={openMonthPicker}
            aria-haspopup="dialog"
            aria-label={`選擇年月，目前為${monthTitle}`}
          >
            <Calendar aria-hidden="true" className="event-calendar-month-title-icon" />
            <span>{monthTitle}</span>
            <ChevronDown
              aria-hidden="true"
              className="event-calendar-month-title-chevron"
            />
          </button>
        ) : null}
        <input
          ref={monthInputRef}
          className={
            supportsShowPicker
              ? "event-calendar-month-input-native event-calendar-month-input-native-hidden"
              : "event-calendar-month-input-native"
          }
          aria-label="選擇年月"
          type="month"
          value={month.slice(0, 7)}
          onChange={(event) => handleMonthInput(event.target.value)}
        />
        <div
          className="event-calendar-view-switch"
          role="group"
          aria-label="行事曆視圖控制"
        >
          <Button
            type="button"
            size="sm"
            variant={view === "month" ? "primary" : "ghost"}
            aria-pressed={view === "month"}
            onClick={() => setView("month")}
          >
            月曆
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "list" ? "primary" : "ghost"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            列表
          </Button>
        </div>
      </div>
      <CalendarSurface>
        <section
          className="event-calendar-surface"
          aria-label="活動行事曆"
        >
          {view === "month" ? (
            <div className="event-calendar-month-grid" role="grid" aria-label={monthTitle}>
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div className={`event-calendar-weekday${day === "日" ? " event-calendar-weekday-sunday" : day === "六" ? " event-calendar-weekday-saturday" : ""}`} role="columnheader" key={day}>
                  {day}
                </div>
              ))}
              {monthDays.map(({ date, day, outsideMonth }) => {
                const dayEvents = getEventsForDate(events, date);
                const holiday = holidays ? holidays.find((item) => item.date === date) : getTaiwanHoliday(date);
                const isSunday = isPocSunday(date);
                const isSaturday = isPocSaturday(date);
                const isSelected = date === selectedDate;
                const isToday = date === formatPocDateInput(new Date());
                const mobileIndicators =
                  dayEvents.length <= 3 ? (
                    dayEvents
                      .slice(0, 3)
                      .map((event) => (
                        <span
                          key={`indicator-${event.id}`}
                          className={`event-calendar-month-event-indicator event-calendar-event-indicator ${eventColorClass(event, "event-calendar-event-indicator")}`}
                          style={eventStyle(event)}
                        />
                      ))
                  ) : (
                    <span className="event-calendar-event-count">{dayEvents.length}</span>
                  );
                return (
                  <button
                    type="button"
                    role="gridcell"
                    key={date}
                    className={
                      "event-calendar-month-cell" +
                      (outsideMonth ? " event-calendar-month-cell-outside" : "") +
                      (isSelected ? " event-calendar-month-cell-selected" : "") +
                      (isToday ? " event-calendar-month-cell-today" : "") +
                      (isSunday ? " event-calendar-month-cell-sunday" : "") +
                      (isSaturday ? " event-calendar-month-cell-saturday" : "") +
                      (holiday?.kind === "holiday" ? " event-calendar-month-cell-holiday" : "") +
                      (holiday?.kind === "makeup_workday" ? " event-calendar-month-cell-makeup-workday" : "")
                    }
                    aria-label={
                      "選取" +
                      formatPocSelectedDate(date) +
                      "，" +
                      dayEvents.length +
                      " 個活動" + (holiday ? `，${holiday.name}` : "")
                    }
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => selectDate(date)}
                  >
                    <span className="event-calendar-month-day-number">{day}</span>
                    {holiday ? (
                      <span className="event-calendar-holiday-label" title={holiday.name}>
                        {holiday.shortName ?? holiday.name}
                      </span>
                    ) : null}
                    {dayEvents.length > 0 ? (
                      <span className="event-calendar-month-event-list" aria-hidden="true">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            className={
                              "event-calendar-event-chip " + eventColorClass(event, "event-calendar-event-chip")
                            }
                            style={eventStyle(event)}
                          >
                            {event.cancelled ? "已取消" : event.title}
                          </span>
                        ))}
                        {mobileIndicators}
                        {dayEvents.length > 2 ? (
                          <span className="event-calendar-event-more">
                            +{dayEvents.length - 2} 個
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="event-calendar-agenda-list" aria-label="活動列表">
              {listGroups.size ? (
                Array.from(listGroups, ([date, dateEvents]) => (
                  <section className="event-calendar-list-group" key={date}>
                    <div className="event-calendar-list-group-heading">
                      <div>
                        <h3 className="event-calendar-list-group-title">{formatPocSelectedDate(date)}</h3>
                        {getTaiwanHoliday(date) ? <p className="event-calendar-list-holiday">{getTaiwanHoliday(date)?.name}</p> : null}
                      </div>
                      <span>{dateEvents.length} 個活動</span>
                    </div>
                    {dateEvents.map((event) => (
                      <PocEventCard
                        key={event.id}
                        event={event}
                        onOpen={setSelectedEvent}
                      />
                    ))}
                  </section>
                ))
              ) : (
                <div className="event-calendar-empty-day">
                  <p>這個月份沒有安排活動</p>
                  <span>請切換其他月份查看活動</span>
                </div>
              )}
            </div>
          )}
        </section>
        {view === "month" ? (
          <section
            className="event-calendar-selected-day"
            aria-labelledby="event-calendar-selected-day-title"
          >
            <div className="event-calendar-agenda-toolbar">
              <h2 id="event-calendar-selected-day-title">
                {formatPocSelectedDate(selectedDate)}
              </h2>
              {getTaiwanHoliday(selectedDate) ? <p className="event-calendar-selected-holiday">{getTaiwanHoliday(selectedDate)?.name}</p> : null}
              <span>{selectedEvents.length} 個活動</span>
            </div>
            {selectedEvents.length ? (
              <div className="event-calendar-selected-events">
                {selectedEvents.map((event) => (
                  <PocEventCard
                    key={event.id}
                    event={event}
                    onOpen={setSelectedEvent}
                  />
                ))}
              </div>
            ) : (
              <div className="event-calendar-empty-day">
                <CalendarDays
                  aria-hidden="true"
                  className="event-calendar-empty-day-icon"
                />
                <p>當天沒有安排活動</p>
                <span>選擇其他日期查看活動</span>
              </div>
            )}
          </section>
        ) : null}
      </CalendarSurface>
      <Modal
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title="活動詳情"
        size="md"
      >
        {selectedEvent ? <EventDetailsContent event={selectedEvent} /> : null}
        {selectedEvent && renderEventActions ? (
          <div className="event-calendar-event-modal-footer">
            <div className="event-calendar-event-modal-actions">
              {renderEventActions(selectedEvent)}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

export type PocCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  cancelled?: boolean;
  publicationStatus?: "draft" | "published";
  color?: "blue" | "violet" | "green" | "orange" | "red" | "cyan" | "black";
  calendarColor?: string | null;
  description?: string;
  checkInOpensAt?: string;
  checkInClosesAt?: string;
  descriptionFormat?: "plain_text" | "rich_text_v1";
  richDescription?: unknown;
};

export function getEventsForDate(events: PocCalendarEvent[], date: string) {
  const dayStart = new Date(`${date}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return events.filter((event) => {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 1);
    return start < dayEnd && end > dayStart;
  });
}

/** 依目前月份篩選並以開始時間排序，供 List View 與未來 API Adapter 共用。 */
export function getEventsForMonth(events: PocCalendarEvent[], month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1, -8));
  const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1, -8));
  return events
    .filter((event) => {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : new Date(start.getTime() + 1);
      return start < nextMonthStart && end > monthStart;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function formatPocTimeRange(event: PocCalendarEvent) {
  const startDate = event.start.slice(0, 10);
  const start = event.start.slice(11, 16);
  const endDate = event.end?.slice(0, 10);
  const end = event.end?.slice(11, 16);
  if (endDate && endDate !== startDate) {
    return `${startDate.slice(5).replace("-", "/")} ${start} → ${endDate.slice(5).replace("-", "/")} ${end}`;
  }
  return end ? `${start}\u2013${end}` : start;
}

const WEEKDAYS = ["\u9031\u65e5", "\u9031\u4e00", "\u9031\u4e8c", "\u9031\u4e09", "\u9031\u56db", "\u9031\u4e94", "\u9031\u516d"] as const;

export function formatPocSelectedDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month} \u6708 ${day} \u65e5\u30fb${weekday}`;
}

export function formatPocDateInput(date: Date) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addPocMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-01";
}

export function getPocMonthRange(month: string) {
  const normalized = `${month.slice(0, 7)}-01`;
  const next = addPocMonths(normalized, 1);
  return { from: `${normalized}T00:00:00+08:00`, to: `${next}T00:00:00+08:00` };
}

/** API 查詢範圍與月曆實際渲染的完整週區間一致，包含前後月份的可見日期。 */
export function getPocCalendarViewRange(month: string) {
  const days = getPocMonthDays(month);
  const first = days[0]?.date;
  const last = days.at(-1)?.date;
  if (!first || !last) return getPocMonthRange(month);
  const nextDay = new Date(`${last}T00:00:00+08:00`);
  nextDay.setTime(nextDay.getTime() + 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(nextDay);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const to = `${values.year}-${values.month}-${values.day}`;
  return { from: `${first}T00:00:00+08:00`, to: `${to}T00:00:00+08:00` };
}

export function getPocMonthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const startOffset = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, index - startOffset + 1));
    const dateString = date.toISOString().slice(0, 10);
    return { date: dateString, day: date.getUTCDate(), outsideMonth: date.getUTCMonth() !== monthNumber - 1 };
  });
}

export function isPocSunday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

export function isPocSaturday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 6;
}

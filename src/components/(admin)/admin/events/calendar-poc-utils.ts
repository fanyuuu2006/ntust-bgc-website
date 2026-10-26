export type PocCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  cancelled?: boolean;
  color?: "blue" | "violet" | "green" | "orange" | "red" | "cyan" | "black";
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

export function formatPocTimeRange(event: PocCalendarEvent) {
  const start = event.start.slice(11, 16);
  const end = event.end?.slice(11, 16);
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

export function getPocMonthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, index - startOffset + 1));
    const dateString = date.toISOString().slice(0, 10);
    return { date: dateString, day: date.getUTCDate(), outsideMonth: date.getUTCMonth() !== monthNumber - 1 };
  });
}

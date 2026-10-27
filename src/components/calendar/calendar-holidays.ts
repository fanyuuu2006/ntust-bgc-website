/**
 * Taiwan government calendar snapshot; update only from the annual DGPA data.
 * Official annual downloads: https://www.dgpa.gov.tw/information?pid=12922&uid=137
 */
export type CalendarHolidayKind = "holiday" | "makeup_workday";
export type CalendarHoliday = { date: string; name: string; kind: CalendarHolidayKind; shortName?: string };
const H = (date: string, name: string, shortName?: string): CalendarHoliday => ({ date, name, kind: "holiday", shortName });
const TAIWAN_HOLIDAYS_2026: readonly CalendarHoliday[] = [
  H("2026-01-01", "\u958b\u570b\u7d00\u5ff5\u65e5"),
  { date: "2026-02-07", name: "\u6625\u7bc0\u8abf\u6574\u653e\u5047\u88dc\u884c\u4e0a\u73ed\u65e5", kind: "makeup_workday", shortName: "\u88dc\u884c\u4e0a\u73ed" },
  ...[14, 15, 16, 17, 18, 19, 20, 21, 22].map((day) => H(`2026-02-${day}`, "\u6625\u7bc0")),
  H("2026-02-27", "\u548c\u5e73\u7d00\u5ff5\u65e5\u88dc\u5047", "\u88dc\u5047"), H("2026-02-28", "\u548c\u5e73\u7d00\u5ff5\u65e5"),
  H("2026-04-03", "\u5152\u7ae5\u7bc0\u88dc\u5047", "\u88dc\u5047"), H("2026-04-04", "\u5152\u7ae5\u7bc0"), H("2026-04-05", "\u6e05\u660e\u7bc0"), H("2026-04-06", "\u6e05\u660e\u7bc0\u88dc\u5047", "\u88dc\u5047"),
  H("2026-05-01", "\u52de\u52d5\u7bc0"), H("2026-06-19", "\u7aef\u5348\u7bc0"),
  H("2026-09-25", "\u4e2d\u79cb\u7bc0\u88dc\u5047", "\u88dc\u5047"), H("2026-09-26", "\u4e2d\u79cb\u7bc0"), H("2026-09-27", "\u5b54\u5b50\u8a95\u8fb0\u7d00\u5ff5\u65e5", "\u6559\u5e2b\u7bc0"), H("2026-09-28", "\u5b54\u5b50\u8a95\u8fb0\u7d00\u5ff5\u65e5\u88dc\u5047", "\u88dc\u5047"),
  H("2026-10-09", "\u570b\u6176\u65e5\u88dc\u5047", "\u88dc\u5047"), H("2026-10-10", "\u570b\u6176\u65e5"), H("2026-10-25", "\u81fa\u7063\u5149\u5fa9\u7d00\u5ff5\u65e5", "\u5149\u5fa9\u7bc0"), H("2026-10-26", "\u81fa\u7063\u5149\u5fa9\u7d00\u5ff5\u65e5\u88dc\u5047", "\u88dc\u5047"),
  H("2026-12-25", "\u884c\u61b2\u7d00\u5ff5\u65e5"),
];
const TAIWAN_HOLIDAYS_2027: readonly CalendarHoliday[] = [
  H("2027-01-01", "\u958b\u570b\u7d00\u5ff5\u65e5"),
  H("2027-02-05", "\u6625\u7bc0"), H("2027-02-06", "\u6625\u7bc0"), H("2027-02-07", "\u6625\u7bc0"), H("2027-02-08", "\u6625\u7bc0"), H("2027-02-09", "\u6625\u7bc0"), H("2027-02-10", "\u6625\u7bc0"), H("2027-02-11", "\u6625\u7bc0"),
  H("2027-02-28", "\u548c\u5e73\u7d00\u5ff5\u65e5"), H("2027-03-01", "\u548c\u5e73\u7d00\u5ff5\u65e5\u88dc\u5047", "\u88dc\u5047"),
  H("2027-04-03", "\u5152\u7ae5\u7bc0"), H("2027-04-04", "\u5152\u7ae5\u7bc0"), H("2027-04-05", "\u6e05\u660e\u7bc0"), H("2027-04-06", "\u6e05\u660e\u7bc0\u88dc\u5047", "\u88dc\u5047"),
  H("2027-04-30", "\u52de\u52d5\u7bc0\u88dc\u5047", "\u88dc\u5047"), H("2027-05-01", "\u52de\u52d5\u7bc0"),
  H("2027-06-09", "\u7aef\u5348\u7bc0"), H("2027-09-15", "\u4e2d\u79cb\u7bc0"),
  H("2027-10-10", "\u570b\u6176\u65e5"), H("2027-10-11", "\u570b\u6176\u65e5\u88dc\u5047", "\u88dc\u5047"),
  H("2027-10-25", "\u81fa\u7063\u5149\u5fa9\u7d00\u5ff5\u65e5"), H("2027-12-24", "\u884c\u61b2\u7d00\u5ff5\u65e5\u88dc\u5047", "\u88dc\u5047"), H("2027-12-25", "\u884c\u61b2\u7d00\u5ff5\u65e5"), H("2027-12-31", "2028\u5e74\u958b\u570b\u7d00\u5ff5\u65e5\u88dc\u5047", "\u88dc\u5047"),
];
const HOLIDAYS_BY_YEAR: Readonly<Record<number, readonly CalendarHoliday[]>> = { 2026: TAIWAN_HOLIDAYS_2026, 2027: TAIWAN_HOLIDAYS_2027 };
export function getTaiwanHoliday(date: string): CalendarHoliday | undefined { return HOLIDAYS_BY_YEAR[Number(date.slice(0, 4))]?.find((holiday) => holiday.date === date); }
export function getTaiwanHolidays(year: number): readonly CalendarHoliday[] { return HOLIDAYS_BY_YEAR[year] ?? []; }

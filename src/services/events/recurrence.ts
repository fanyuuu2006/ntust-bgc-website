import { z } from "zod";

export const RECURRENCE_MAX_OCCURRENCES = 200;
export const RECURRENCE_DEFAULT_TIMEZONE = "Asia/Taipei";

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(365),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  count: z.number().int().min(1).max(RECURRENCE_MAX_OCCURRENCES).optional(),
}).superRefine((rule, ctx) => {
  if (!rule.until && rule.count === undefined) ctx.addIssue({ code: "custom", message: "重複活動必須設定結束日期或次數" });
  if (rule.until && rule.count !== undefined) ctx.addIssue({ code: "custom", message: "結束日期與次數只能擇一" });
  if (rule.frequency !== "weekly" && rule.byWeekday?.length) ctx.addIssue({ code: "custom", message: "指定星期只能用於每週重複" });
  if (rule.byWeekday && new Set(rule.byWeekday).size !== rule.byWeekday.length) ctx.addIssue({ code: "custom", message: "指定星期不可重複" });
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;
export type GeneratedOccurrence = { originalStartTime: string; startTime: string; endTime: string; timezone: string; recurrenceInstanceKey: string };

function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("日期格式不正確");
  const date = new Date(`${value}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== value) throw new Error("日期不存在");
  return date;
}
function dateText(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, amount: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + amount); return next; }
function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function offsetMinutes(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return (Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - instant.getTime()) / 60000;
}
function localToUtc(local: string, timezone: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local);
  if (!match) throw new Error("日期時間格式不正確");
  dateOnly(match[1]);
  const minute = Number(match[3]); const hour = Number(match[2]); const second = Number(match[4] ?? 0);
  if (hour > 23 || minute > 59 || second > 59) throw new Error("時間不正確");
  const localAsUtc = new Date(Date.UTC(Number(match[1].slice(0, 4)), Number(match[1].slice(5, 7)) - 1, Number(match[1].slice(8, 10)), hour, minute, second));
  let instant = localAsUtc;
  // 以「當地時間視為 UTC」作為初始猜測，每次都從同一基準重新套用時區偏移，避免反覆扣除造成漂移。
  for (let index = 0; index < 4; index += 1) instant = new Date(localAsUtc.getTime() - offsetMinutes(instant, timezone) * 60000);
  const checkParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const check = `${checkParts.year}-${checkParts.month}-${checkParts.day}T${checkParts.hour}:${checkParts.minute}`;
  if (check !== `${match[1]}T${match[2]}:${match[3]}`) throw new Error("指定的時區不存在此日期時間");
  return instant.toISOString();
}

/** 以 local date 產生 occurrence；月末不存在的日期會略過，不自動調整到月底。 */
export function generateOccurrences(input: { startDate: string; startTime: string; endTime: string; timezone?: string; recurrenceRule: RecurrenceRule }): GeneratedOccurrence[] {
  const timezone = input.timezone ?? RECURRENCE_DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new Error("指定的時區無效");
  }
  const rule = recurrenceRuleSchema.parse(input.recurrenceRule);
  const start = dateOnly(input.startDate);
  const until = rule.until ? dateOnly(rule.until) : null;
  if (until && until < start) throw new Error("結束日期不可早於開始日期");
  const result: GeneratedOccurrence[] = [];
  const seen = new Set<string>();
  let cursor = new Date(start);
  let guard = 0;
  while (result.length < (rule.count ?? RECURRENCE_MAX_OCCURRENCES) && guard++ < 100000) {
    const days = daysBetween(start, cursor);
    const week = Math.floor(days / 7);
    const valid = rule.frequency === "daily" ? days % rule.interval === 0 : rule.frequency === "weekly" ? week % rule.interval === 0 && (rule.byWeekday?.length ? rule.byWeekday.includes(cursor.getUTCDay()) : cursor.getUTCDay() === start.getUTCDay()) : cursor.getUTCDate() === start.getUTCDate() && (cursor.getUTCMonth() - start.getUTCMonth() + 12 * (cursor.getUTCFullYear() - start.getUTCFullYear())) % rule.interval === 0;
    if (valid) {
      if (until && cursor > until) break;
      const original = `${dateText(cursor)}T${input.startTime}`;
      const startTime = localToUtc(original, timezone);
      let endDate = dateText(cursor);
      if (input.endTime <= input.startTime) endDate = dateText(addDays(cursor, 1));
      const endTime = localToUtc(`${endDate}T${input.endTime}`, timezone);
      const key = `${timezone}:${original}`;
      if (seen.has(key)) throw new Error("產生重複的活動場次");
      seen.add(key); result.push({ originalStartTime: original, startTime, endTime, timezone, recurrenceInstanceKey: key });
    }
    if (until && cursor >= until) break;
    cursor = addDays(cursor, 1);
  }
  if (guard >= 100000) throw new Error("重複規則展開超過安全上限");
  return result;
}

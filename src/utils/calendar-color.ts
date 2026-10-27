export const DEFAULT_CALENDAR_COLOR = "#2563EB";
export const CALENDAR_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isCalendarColor(value: unknown): value is string {
  return typeof value === "string" && CALENDAR_COLOR_PATTERN.test(value);
}

export function getCalendarColor(value: string | null | undefined): string {
  return isCalendarColor(value) ? value : DEFAULT_CALENDAR_COLOR;
}

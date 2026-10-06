export const PURCHASE_SUGGESTION_STATUS_LABELS = {
  pending: "待評估", purchased: "已購入", rejected: "不採納",
} as const;

/** Taipei has a fixed UTC+08 offset; Monday 00:00 starts the quota week. */
export function getPurchaseSuggestionWeek(now = new Date()) {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const weekday = (shifted.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - weekday) - 8 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: new Date(start.getTime() + 7 * 86400000).toISOString() };
}

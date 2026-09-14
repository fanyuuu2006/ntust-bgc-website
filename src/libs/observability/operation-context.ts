/** 固定查詢用途，不接受使用者輸入、查詢參數或任意 metadata 物件。 */
const operationContexts = [
  "session-validity",
  "user-lookup",
  "user-session",
  "admin-guard",
  "officer-history-check",
  "board-games-total",
  "borrowings-pending",
  "borrowings-approved",
  "borrowings-borrowed",
  "borrowings-overdue",
  "borrowings-returned",
  "borrowings-rejected",
  "borrowings-cancelled",
  "borrowings-filtered",
] as const;

export type OperationContext = (typeof operationContexts)[number];

/** 同時檢查 runtime 值，避免 JavaScript 呼叫或不安全轉型繞過 TypeScript。 */
export function isOperationContext(value: unknown): value is OperationContext {
  return (
    typeof value === "string" &&
    operationContexts.some((context) => context === value)
  );
}

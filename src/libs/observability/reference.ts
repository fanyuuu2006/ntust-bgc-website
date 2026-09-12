const ERROR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isErrorId(value: unknown): value is string {
  return typeof value === "string" && ERROR_ID.test(value);
}

export const UNEXPECTED_ERROR_MESSAGE = "操作暫時無法完成，請稍後再試。";

// Existing forms retain Error.message strings. Keep the reference through that boundary.
export function errorMessageWithReference(message: string, errorId: string): string {
  return `${message}\n錯誤追蹤碼：${errorId}`;
}

export function readErrorReference(message: string) {
  const match = /\n錯誤追蹤碼：([^\n]+)$/.exec(message);
  return match && isErrorId(match[1])
    ? { message: message.slice(0, match.index), errorId: match[1] }
    : { message, errorId: undefined };
}

/**
 * JWT 時間驗證失敗是基礎設施認證錯誤，不代表網站 Session 不存在。
 * 只辨識明確的 HTTP/code/message 組合；不將所有 401 或使用者憑證錯誤歸入。
 */
export function isAuthInfrastructureUnavailable(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 4) return false;
  const own = (key: string): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(error, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  };
  const message = own("message");
  if (own("status") === 401 && own("code") === "PGRST303" && typeof message === "string" && message.toLowerCase().includes("jwt issued at future")) return true;
  const cause = own("cause");
  return cause !== error && isAuthInfrastructureUnavailable(cause, depth + 1);
}

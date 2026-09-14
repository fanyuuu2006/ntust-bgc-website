import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * 將高熵 Cookie 憑證轉為資料庫查詢識別值，避免原始登入憑證進入資料庫與 REST URL。
 * 雜湊只供 Server 查詢；瀏覽器仍使用原始隨機值，不能用雜湊直接登入。
 */
export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

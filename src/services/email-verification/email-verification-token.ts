import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function generateEmailVerificationToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

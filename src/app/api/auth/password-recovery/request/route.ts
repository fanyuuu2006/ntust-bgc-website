import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { checkRateLimit, getRequestIp } from "@/libs/security/rate-limit";
import { reportUnexpectedError } from "@/libs/observability/report";
import { passwordRecoveryRequestSchema, passwordRecoveryService } from "@/services/auth/password-recovery.service";

const responseBody = { data: { message: "如果此 Email 對應可恢復的帳號，我們會寄出密碼重設信件。" } };
const limit = { limit: 5, windowMs: 15 * 60_000 };

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ message: "請輸入有效的 Email" }, { status: 400 }); }
  const parsed = passwordRecoveryRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: "請輸入有效的 Email" }, { status: 400 });

  const emailKey = createHash("sha256").update(parsed.data.email).digest("hex");
  const byIp = checkRateLimit(`auth:recovery:ip:${getRequestIp(request)}`, limit);
  const byEmail = checkRateLimit(`auth:recovery:email:${emailKey}`, limit);
  if (byIp.allowed && byEmail.allowed) {
    try { await passwordRecoveryService.request(parsed.data); }
    catch (error) { reportUnexpectedError(error, { context: "[POST /api/auth/password-recovery/request]" }); }
  }
  return NextResponse.json(responseBody);
}

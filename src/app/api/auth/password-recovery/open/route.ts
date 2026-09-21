import { NextResponse } from "next/server";
import { reportUnexpectedError } from "@/libs/observability/report";
import { RECOVERY_COOKIE_NAME, RECOVERY_TOKEN_LIFETIME_MINUTES, passwordRecoveryService } from "@/services/auth/password-recovery.service";

/** Scanner-safe: inspection and a browser-scoped cookie only, with no token consumption. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  let valid = false;
  try { valid = await passwordRecoveryService.inspect(token); }
  catch (error) { reportUnexpectedError(error, { context: "[GET /api/auth/password-recovery/open]" }); }
  const response = NextResponse.redirect(new URL(valid ? "/reset-password" : "/reset-password?result=invalid", request.url), { status: 303 });
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set({
    name: RECOVERY_COOKIE_NAME, value: valid ? token : "", httpOnly: true,
    secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    maxAge: valid ? RECOVERY_TOKEN_LIFETIME_MINUTES * 60 : 0,
  });
  return response;
}

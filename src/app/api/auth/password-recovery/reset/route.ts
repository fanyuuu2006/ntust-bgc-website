import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { reportUnexpectedError } from "@/libs/observability/report";
import { cookies } from "next/headers";
import { RECOVERY_COOKIE_NAME, passwordRecoveryService } from "@/services/auth/password-recovery.service";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return redirectTo(request, "/reset-password?result=invalid");
  let form: FormData;
  try { form = await request.formData(); }
  catch { return redirectTo(request, "/reset-password?result=invalid"); }
  const token = (await cookies()).get(RECOVERY_COOKIE_NAME)?.value ?? "";
  try {
    const result = await passwordRecoveryService.reset({
      token, newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword"),
    });
    const response = redirectTo(request, result === "reset" ? "/login?passwordReset=success" : "/reset-password?result=invalid");
    response.cookies.set({ name: RECOVERY_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof ZodError) return redirectTo(request, token ? "/reset-password?result=password-invalid" : "/reset-password?result=invalid");
    const errorId = reportUnexpectedError(error, { context: "[POST /api/auth/password-recovery/reset]" });
    return redirectTo(request, `/reset-password?result=error&errorId=${errorId}`);
  }
}

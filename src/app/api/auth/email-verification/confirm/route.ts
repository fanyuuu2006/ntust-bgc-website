import { NextResponse } from "next/server";

import { reportUnexpectedError } from "@/libs/observability/report";
import { emailVerificationService } from "@/services/email-verification/email-verification.service";

function verificationPage(request: Request, result: "success" | "invalid" | "error", errorId?: string) {
  const location = new URL("/verify-email", request.url);
  location.searchParams.set("result", result);
  if (errorId) location.searchParams.set("errorId", errorId);
  return NextResponse.redirect(location, { status: 303 });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get("token");
    if (typeof token !== "string") return verificationPage(request, "invalid");

    const result = await emailVerificationService.verify(token);
    return verificationPage(
      request,
      result === "verified" ? "success" : "invalid",
    );
  } catch (error) {
    const errorId = reportUnexpectedError(error, { context: "[POST /api/auth/email-verification/confirm]" });
    return verificationPage(request, "error", errorId);
  }
}

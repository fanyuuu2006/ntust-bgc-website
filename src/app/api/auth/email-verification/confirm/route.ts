import { NextResponse } from "next/server";

import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { emailVerificationService } from "@/services/email-verification/email-verification.service";

function verificationPage(request: Request, result: "success" | "invalid") {
  const location = new URL("/verify-email", request.url);
  location.searchParams.set("result", result);
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
    return unexpectedErrorResponse(
      "[POST /api/auth/email-verification/confirm]",
      error,
      "Email 驗證失敗，請稍後再試",
    );
  }
}

import { NextResponse } from "next/server";

import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { getCurrentUser } from "@/libs/auth";
import { TransactionalEmailDeliveryError } from "@/libs/email/transactional-email";
import { EmailVerificationCooldownError } from "@/services/email-verification/email-verification.errors";
import { emailVerificationService } from "@/services/email-verification/email-verification.service";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  try {
    const result = await emailVerificationService.request(user);
    const status = result === "already_verified" ? "already_verified" : "sent";
    return NextResponse.json({ data: { status } }, { status: 200 });
  } catch (error) {
    if (error instanceof EmailVerificationCooldownError) {
      return NextResponse.json(
        { message: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfter) },
        },
      );
    }

    if (error instanceof TransactionalEmailDeliveryError) {
      console.error("[EmailVerification] Resend delivery failed");
      return NextResponse.json(
        { message: "驗證信暫時無法寄出，請稍後再試" },
        { status: 503 },
      );
    }

    return unexpectedErrorResponse(
      "[POST /api/auth/email-verification/resend]",
      error,
      "重新寄送驗證信失敗，請稍後再試",
    );
  }
}

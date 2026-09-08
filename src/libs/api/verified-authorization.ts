import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/libs/auth";

export async function authorizeVerifiedRequest() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ message: "請先登入" }, { status: 401 }),
    };
  }

  if (!user.email_verified_at) {
    return {
      user: null,
      response: NextResponse.json(
        {
          message: "請先完成 Email 驗證",
          code: "EMAIL_VERIFICATION_REQUIRED",
        },
        { status: 403 },
      ),
    };
  }

  return { user, response: null };
}

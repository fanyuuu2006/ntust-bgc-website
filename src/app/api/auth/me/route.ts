import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";

export async function GET() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      {
        message: "尚未登入",
      },
      {
        status: 401,
      },
    );
  }

  const user = await authService.getAuthenticatedUser(token);

  if (!user) {
    return NextResponse.json(
      {
        message: "尚未登入或登入已過期",
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
}

import { NextResponse } from "next/server";
import { getSessionTokenFromCookie, SESSION_COOKIE_NAME } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";

export async function POST() {
  try {
    const token = await getSessionTokenFromCookie();

    if (token) {
      await authService.logout(token);
    }

    const response = NextResponse.json({
      message: "登出成功",
    });

    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  } catch (error) {
    console.error("[POST /api/auth/logout]", error);
    return NextResponse.json(
      { message: "登出失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

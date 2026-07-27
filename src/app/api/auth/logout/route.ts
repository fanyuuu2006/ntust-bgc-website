import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";

export async function POST() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await authService.logout(token);
  }

  const response = NextResponse.json({
    message: "登出成功",
  });

  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}

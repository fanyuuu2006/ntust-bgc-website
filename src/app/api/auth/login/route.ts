import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authService } from "@/services/auth/auth.service";
import { InvalidCredentialsError } from "@/services/auth/auth.errors";
import { SESSION_COOKIE_NAME } from "@/libs/auth";
import { checkRateLimit, getRequestIp } from "@/libs/security/rate-limit";

const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
  try {
  const rateLimit = checkRateLimit(
    `auth:login:${getRequestIp(request)}`,
    LOGIN_RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "嘗試次數過多，請稍後再試" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "請求格式錯誤",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const { user, session } = await authService.login(body);

    const response = NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: Boolean(user.email_verified_at),
        },
      },
      {
        status: 200,
      },
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expires_at),
    });

    return response;
  } catch (error) {

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "輸入資料格式不正確",
          errors: z.treeifyError(error),
        },
        {
          status: 400,
        },
      );
    }

    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json(
        {
          message: "Email 或密碼錯誤",
        },
        {
          status: 401,
        },
      );
    }

    return unexpectedErrorResponse("[POST /api/auth/login]", error, "登入失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[POST /api/auth/login]", error, "操作暫時無法完成，請稍後再試。");
  }
}

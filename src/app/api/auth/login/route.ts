import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authService } from "@/services/auth/auth.service";
import { InvalidCredentialsError } from "@/services/auth/auth.errors";
import { SESSION_COOKIE_NAME } from "@/libs/auth";

export async function POST(request: Request) {
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
          errors: error.issues,
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

    console.error("[POST /api/auth/login]", error);

    return NextResponse.json(
      {
        message: "登入失敗，請稍後再試",
      },
      {
        status: 500,
      },
    );
  }
}

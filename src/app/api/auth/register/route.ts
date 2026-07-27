import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authService } from "@/services/auth/auth.service";
import { EmailAlreadyExistsError } from "@/services/auth/auth.errors";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "請求格式錯誤，請確認送出的 JSON 格式" },
      { status: 400 },
    );
  }

  try {
    const user = await authService.register(body);

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "輸入資料格式不正確",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (error instanceof EmailAlreadyExistsError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    console.error("[POST /api/auth/register]", error);

    return NextResponse.json(
      { message: "註冊失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

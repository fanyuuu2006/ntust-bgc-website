import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authService } from "@/services/auth/auth.service";
import { EmailAlreadyExistsError } from "@/services/auth/auth.errors";
import { verifyTurnstile } from "@/libs/security/turnstile";

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
    // 先驗證 Turnstile
    if (
      typeof body !== "object" ||
      body === null ||
      !("turnstileToken" in body) ||
      typeof body.turnstileToken !== "string"
    ) {
      return NextResponse.json({ message: "請完成安全驗證" }, { status: 400 });
    }

    const verified = await verifyTurnstile(body.turnstileToken);

    if (!verified) {
      return NextResponse.json(
        { message: "安全驗證失敗，請重新嘗試" },
        { status: 403 },
      );
    }

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
    console.error("[POST /api/auth/register]", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "輸入資料格式不正確",
          errors: z.treeifyError(error),
        },
        { status: 400 },
      );
    }

    if (error instanceof EmailAlreadyExistsError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: "註冊失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

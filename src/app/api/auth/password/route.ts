import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { authService } from "@/services/auth/auth.service";
import { InvalidCurrentPasswordError } from "@/services/auth/auth.errors";

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    const { user } = authorization;

    const body = await request.json();
    await authService.changePassword(user.id, body);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }
    if (error instanceof InvalidCurrentPasswordError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    console.error("[PATCH /api/auth/password]", error);
    return NextResponse.json(
      { message: "更新密碼失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

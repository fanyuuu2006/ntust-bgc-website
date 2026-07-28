import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUser } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";
import { InvalidCurrentPasswordError } from "@/services/auth/auth.errors";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "尚未登入" }, { status: 401 });
    }

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

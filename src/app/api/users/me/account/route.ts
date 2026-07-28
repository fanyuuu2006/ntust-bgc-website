import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUser } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "尚未登入" }, { status: 401 });
    }

    const body = await request.json();
    const updated = await usersService.updateAccount(user.id, body);

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/users/me/account]", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "更新帳號資訊失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

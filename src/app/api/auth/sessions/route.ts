import { NextResponse } from "next/server";
import { getCurrentUser } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";
import { SESSION_COOKIE_NAME } from "@/libs/auth";
import { cookies } from "next/headers";

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "尚未登入" }, { status: 401 });
    }
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { message: "無法取得當前登入的 session" },
        { status: 400 },
      );
    }
    await authService.revokeOtherSessions(user.id, token);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[DELETE /api/auth/sessions]", error);
    return NextResponse.json(
      { message: "登出其他裝置失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

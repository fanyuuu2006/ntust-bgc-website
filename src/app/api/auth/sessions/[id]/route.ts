import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";
import {
  SessionNotFoundError,
  CannotRevokeCurrentSessionError,
} from "@/services/auth/auth.errors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "尚未登入" }, { status: 401 });
    }

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { message: "無法取得當前登入的 session" },
        { status: 400 },
      );
    }

    await authService.revokeSession(user.id, id, token);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[DELETE /api/auth/sessions/[id]]", error);
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof CannotRevokeCurrentSessionError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "登出裝置失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

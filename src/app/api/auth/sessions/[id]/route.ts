import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/libs/auth";
import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
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
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    const { user } = authorization;

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

    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof CannotRevokeCurrentSessionError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return unexpectedErrorResponse("[DELETE /api/auth/sessions/[id]]", error, "登出裝置失敗，請稍後再試");
  }
}

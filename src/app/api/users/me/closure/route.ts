import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUser, getSessionTokenFromCookie, SESSION_COOKIE_NAME } from "@/libs/auth";
import { authService } from "@/services/auth/auth.service";
import { InvalidCredentialsError, InvalidCurrentPasswordError } from "@/services/auth/auth.errors";
import { AccountClosureBlockedError } from "@/services/auth/account-closure.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { checkRateLimit } from "@/libs/security/rate-limit";
import { removeOwnedAvatarObject } from "@/services/avatars/avatars.service";

export async function POST(request: Request) {
  try {
    // 未驗證 Email 也可註銷；身份一律由目前 cookie 決定，不能用 body 指定。
    const token = await getSessionTokenFromCookie();
    const user = await getCurrentUser();
    if (!token || !user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const limit = checkRateLimit(`account:closure:${user.id}`, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ message: "嘗試次數過多，請稍後再試" }, {
      status: 429, headers: { "Retry-After": String(limit.retryAfter) },
    });
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "請求格式錯誤" }, { status: 400 }); }
    await authService.closeAccount(user.id, token, body);
    await removeOwnedAvatarObject(user.id, user.avatar);
    const response = NextResponse.json({ data: { success: true } });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "請確認密碼與註銷確認文字", errors: z.treeifyError(error) }, { status: 400 });
    if (error instanceof AccountClosureBlockedError) return NextResponse.json({ message: error.message }, { status: 409 });
    if (error instanceof InvalidCurrentPasswordError) return NextResponse.json({ message: error.message }, { status: 401 });
    if (error instanceof InvalidCredentialsError) return NextResponse.json({ message: "登入或密碼驗證已失效，請重新登入後再試" }, { status: 401 });
    return unexpectedErrorResponse("[POST /api/users/me/closure]", error, "註銷暫時無法完成，請稍後再試");
  }
}

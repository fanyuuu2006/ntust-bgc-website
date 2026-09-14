import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { usersService } from "@/services/users/users.service";
import { UserProfileNotFoundError } from "@/services/users/users.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeAdminRequest("沒有管理權限");
    if (authorization.response) return authorization.response;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "請求格式錯誤" }, { status: 400 }); }
    const { id } = await params;
    return NextResponse.json({ data: await usersService.updateAccount(id, body) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
    if (error instanceof UserProfileNotFoundError) return NextResponse.json({ message: "帳號不存在或已註銷" }, { status: 404 });
    return unexpectedErrorResponse("[PATCH /api/admin/users/[id]/account]", error, "更新帳號資料失敗，請稍後再試");
  }
}

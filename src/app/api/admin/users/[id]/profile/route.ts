import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { usersService } from "@/services/users/users.service";
import { UserProfileNotFoundError } from "@/services/users/users.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;

  try {
    const { id } = await params;
    const profile = await usersService.updateProfileForAdmin(id, await request.json());
    return NextResponse.json({ data: profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    if (error instanceof UserProfileNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return unexpectedErrorResponse(
      "[PATCH /api/admin/users/[id]/profile]",
      error,
      "更新使用者資料失敗，請稍後再試",
    );
  }
}

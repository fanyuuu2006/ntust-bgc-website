import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && (await isAdminByUserId(user.id)) ? user : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });
  }

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

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "更新使用者資料失敗" },
      { status: 404 },
    );
  }
}

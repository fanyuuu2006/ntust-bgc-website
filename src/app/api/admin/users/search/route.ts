import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  if (!(await isAdminByUserId(user.id))) {
    return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });
  }

  try {
    const search = new URL(request.url).searchParams.get("search") ?? "";
    const data = await usersService.searchForAdminPicker({ search });
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "搜尋條件格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    console.error("[GET /api/admin/users/search]", error);
    return NextResponse.json(
      { message: "搜尋使用者失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

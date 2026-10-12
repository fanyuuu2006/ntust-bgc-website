import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { usersService } from "@/services/users/users.service";

export async function GET(request: Request) {
  try {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;

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


    return unexpectedErrorResponse("[GET /api/admin/users/search]", error, "搜尋使用者失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/users/search]", error, "操作暫時無法完成，請稍後再試。");
  }
}

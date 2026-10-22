import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { usersService } from "@/services/users/users.service";

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    const result = await usersService.updateProfileVisibility(authorization.user.id, await request.json());
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
    }
    return unexpectedErrorResponse(
      "[PATCH /api/users/me/profile-visibility]",
      error,
      "更新個人檔案可見性失敗，請稍後再試",
    );
  }
}

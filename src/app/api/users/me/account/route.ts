import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { usersService } from "@/services/users/users.service";

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    const { user } = authorization;

    const body = await request.json();
    const updated = await usersService.updateAccount(user.id, body);

    return NextResponse.json({ data: updated });
  } catch (error) {

    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    return unexpectedErrorResponse("[PATCH /api/users/me/account]", error, "更新帳號資訊失敗，請稍後再試");
  }
}

import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { isAdminByUserId } from "@/libs/auth";
import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { queryRecordFromSearchParams } from "@/libs/query-params";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { listBorrowingsQuerySchema } from "@/services/board-games/board-games.schema";

export async function GET(request: NextRequest) {
  try {
  const authorization = await authorizeVerifiedRequest();
  if (authorization.response) return authorization.response;
  const { user } = authorization;
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  const isAdmin = await isAdminByUserId(user.id);
  if (!isAdmin) {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  try {
    const query = listBorrowingsQuerySchema.parse(
      queryRecordFromSearchParams(request.nextUrl.searchParams),
    );

    const borrowings = await boardGamesService.listBorrowings(query);

    return NextResponse.json({ data: borrowings }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "查詢參數格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }


    return unexpectedErrorResponse("[GET /api/admin/borrowings]", error, "取得借用列表失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/borrowings]", error, "操作暫時無法完成，請稍後再試。");
  }
}

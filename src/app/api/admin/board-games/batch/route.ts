import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { BoardGameBatchConflictError, BoardGameCategoryNotFoundError, BoardGameLocationNotFoundError } from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";

export async function PATCH(request: Request) {
  try {
    const authorization = await authorizeAdminRequest("沒有桌遊管理權限");
    if (authorization.response) return authorization.response;
    try {
      return NextResponse.json({ data: await boardGamesService.bulkUpdateClassificationForAdmin(await request.json()) });
    } catch (error) {
      if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
      if (error instanceof BoardGameCategoryNotFoundError || error instanceof BoardGameLocationNotFoundError) return NextResponse.json({ message: error.message }, { status: 400 });
      if (error instanceof BoardGameBatchConflictError) return NextResponse.json({ message: error.message }, { status: 409 });
      return unexpectedErrorResponse("[PATCH /api/admin/board-games/batch]", error, "批次更新桌遊失敗，請稍後再試");
    }
  } catch (error) {
    return unexpectedErrorResponse("[PATCH /api/admin/board-games/batch]", error, "無法確認桌遊管理權限，請稍後再試");
  }
}

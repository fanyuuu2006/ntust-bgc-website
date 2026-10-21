import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import {
  BorrowingBatchConflictError,
  BorrowingDueDateError,
} from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";

export async function PATCH(request: Request) {
  try {
    const authorization = await authorizeAdminRequest("您沒有批次管理借用紀錄的權限。");
    if (authorization.response) return authorization.response;

    try {
      const data = await boardGamesService.bulkUpdateBorrowingsForAdmin(
        authorization.user.id,
        await request.json(),
      );
      return NextResponse.json({ data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: "輸入資料格式不正確。", errors: z.treeifyError(error) },
          { status: 400 },
        );
      }
      if (error instanceof BorrowingBatchConflictError) {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }
      if (error instanceof BorrowingDueDateError) {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }
      return unexpectedErrorResponse(
        "[PATCH /api/admin/borrowings/batch]",
        error,
        "批次更新借用紀錄失敗，請稍後再試。",
      );
    }
  } catch (error) {
    return unexpectedErrorResponse(
      "[PATCH /api/admin/borrowings/batch]",
      error,
      "無法完成借用紀錄權限驗證，請稍後再試。",
    );
  }
}

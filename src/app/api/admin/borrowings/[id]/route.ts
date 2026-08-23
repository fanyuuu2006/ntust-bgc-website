import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import {
  BorrowingDueDateError,
  BorrowingNotFoundError,
  BorrowingStatusTransitionError,
} from "@/services/board-games/board-games.errors";
import { updateBorrowingActionSchema } from "@/services/board-games/board-games.schema";
import { boardGamesService } from "@/services/board-games/board-games.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
  if (!(await isAdminByUserId(user.id))) return NextResponse.json({ message: "您沒有管理借用紀錄的權限" }, { status: 403 });

  try {
    const { id } = await params;
    const payload = updateBorrowingActionSchema.parse(await request.json());
    const result = payload.action === "approve"
      ? await boardGamesService.approveBorrowing(id, user.id)
      : payload.action === "reject"
        ? await boardGamesService.rejectBorrowing(id, user.id)
        : payload.action === "checkout"
          ? await boardGamesService.checkOutBorrowing(id, payload.due_at ?? "")
          : await boardGamesService.returnBorrowing(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
    if (error instanceof BorrowingNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error instanceof BorrowingStatusTransitionError || error instanceof BorrowingDueDateError) return NextResponse.json({ message: error.message }, { status: 409 });
    console.error("[PATCH /api/admin/borrowings/[id]]", error);
    return NextResponse.json({ message: "更新借用紀錄失敗，請稍後再試" }, { status: 500 });
  }
}

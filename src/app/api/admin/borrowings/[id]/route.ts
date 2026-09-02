import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import {
  BorrowingDueDateError,
  BorrowingNotFoundError,
  BorrowingStatusTransitionError,
  BorrowingWorkflowConflictError,
  BoardGameHasOpenBorrowingError,
  BoardGameNotAvailableForBorrowingError,
} from "@/services/board-games/board-games.errors";
import {
  updateBorrowingActionSchema,
  updateBorrowingDueDateSchema,
} from "@/services/board-games/board-games.schema";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { parsePositiveIntegerId } from "@/libs/zod/ids";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
  if (!(await isAdminByUserId(user.id))) return NextResponse.json({ message: "您沒有管理借用紀錄的權限" }, { status: 403 });

  try {
    const { id: rawId } = await params;
    const id = parsePositiveIntegerId(rawId);
    const body = await request.json();
    const actionPayload = updateBorrowingActionSchema.safeParse(body);
    const result = actionPayload.success
      ? actionPayload.data.action === "approve"
        ? await boardGamesService.approveBorrowing(id, user.id)
        : actionPayload.data.action === "reject"
          ? await boardGamesService.rejectBorrowing(id, user.id)
          : actionPayload.data.action === "checkout"
            ? await boardGamesService.checkOutBorrowing(id, actionPayload.data.due_at ?? "")
            : await boardGamesService.returnBorrowing(id)
      : await boardGamesService.updateBorrowingDueDate(
          id,
          updateBorrowingDueDateSchema.parse(body).due_at,
        );
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
    if (error instanceof BorrowingNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error instanceof BorrowingStatusTransitionError || error instanceof BorrowingDueDateError || error instanceof BorrowingWorkflowConflictError || error instanceof BoardGameHasOpenBorrowingError || error instanceof BoardGameNotAvailableForBorrowingError) return NextResponse.json({ message: error.message }, { status: 409 });
    console.error("[PATCH /api/admin/borrowings/[id]]", error);
    return NextResponse.json({ message: "更新借用紀錄失敗，請稍後再試" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
  if (!(await isAdminByUserId(user.id))) return NextResponse.json({ message: "沒有管理借用紀錄的權限" }, { status: 403 });

  try {
    const { id: rawId } = await params;
    await boardGamesService.deleteBorrowing(parsePositiveIntegerId(rawId));
    return NextResponse.json({ data: null }, { status: 200 });
  } catch (error) {
    if (error instanceof BorrowingNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error instanceof BorrowingWorkflowConflictError) return NextResponse.json({ message: error.message }, { status: 409 });
    console.error("[DELETE /api/admin/borrowings/[id]]", error);
    return NextResponse.json({ message: "刪除借用紀錄失敗，請稍後再試" }, { status: 500 });
  }
}

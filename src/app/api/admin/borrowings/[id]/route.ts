import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import {
  BorrowingNotFoundError,
  BorrowingStatusTransitionError,
} from "@/services/board-games/board-games.errors";
import { updateBorrowingActionSchema } from "@/services/board-games/board-games.schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  const isAdmin = await isAdminByUserId(user.id);
  if (!isAdmin) {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateBorrowingActionSchema.parse(body);

    let result;

    if (parsed.action === "approve") {
      result = await boardGamesService.approveBorrowing(id, user.id);
    } else if (parsed.action === "reject") {
      result = await boardGamesService.rejectBorrowing(id, user.id);
    } else if (parsed.action === "checkout") {
      if (!parsed.due_at) {
        return NextResponse.json(
          { message: "請輸入預計歸還日期" },
          { status: 400 },
        );
      }
      result = await boardGamesService.checkOutBorrowing(id, parsed.due_at);
    } else {
      result = await boardGamesService.returnBorrowing(id);
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    if (error instanceof BorrowingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof BorrowingStatusTransitionError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    console.error("[PATCH /api/admin/borrowings/[id]]", error);
    return NextResponse.json(
      { message: "更新借用狀態失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
